'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scissors,
  Volume2,
  Gauge,
  Sliders,
  RotateCcw,
  X,
  Play,
  Pause,
  Download,
  Upload,
  Sparkles,
  Check,
  ChevronDown,
  TrendingUp,
  Split,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import {
  audioBufferToWav,
  trimAudioBuffer,
  cutOutAudioBuffer,
  applyFade,
  decodeAudio,
  extractWaveformPeaks,
  formatAudioTimestamp,
  parseAudioTimestamp,
  changeVolume
} from '@/lib/audio/engines';
import { downloadBlob, readFileAsArrayBuffer, formatFileSize } from '@/lib/utils';

interface InteractiveAudioCutterProps {
  toolTitle?: string;
  defaultFormat?: 'mp3' | 'wav';
  allowedFormats?: string[];
}

export default function InteractiveAudioCutter({
  toolTitle = 'Audio Cutter & Waveform Trimmer',
  defaultFormat = 'mp3',
  allowedFormats = ['mp3', 'wav', 'ogg', 'm4a']
}: InteractiveAudioCutterProps) {
  // File & Audio States
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState<number>(0);

  // Trim Selection & Playhead
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Settings & Toggles matching the screenshot
  const [activeTab, setActiveTab] = useState<'trim' | 'volume' | 'speed' | 'equalizer'>('trim');
  const [fadeIn, setFadeIn] = useState<boolean>(false);
  const [fadeOut, setFadeOut] = useState<boolean>(false);
  const [cutMode, setCutMode] = useState<'keep' | 'remove'>('keep'); // keep selection vs remove selection
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(100); // 0% to 200%
  const [exportFormat, setExportFormat] = useState<string>(defaultFormat);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Interactive Drag States
  const [dragTarget, setDragTarget] = useState<'start' | 'end' | 'range' | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<'start' | 'end' | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);
  const dragEndTimeRef = useRef<number>(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const toast = useToast();

  // Get or initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Decode and load an audio file
  const loadAudioFile = async (f: File) => {
    stopPlayback();
    setFile(f);
    setFileName(f.name);
    setFileSize(f.size);

    try {
      const arrayBuffer = await readFileAsArrayBuffer(f);
      const ctx = getAudioContext();
      const decoded = await decodeAudio(arrayBuffer, ctx);

      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      setStartTime(0);
      setEndTime(decoded.duration);
      setCurrentTime(0);
      toast.success(`Loaded "${f.name}" (${decoded.duration.toFixed(1)}s)`);
    } catch {
      toast.error('Failed to decode audio file');
    }
  };

  // Generate a pleasant synth audio sample for instant testing
  const loadSampleAudio = async () => {
    stopPlayback();
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const sampleDuration = 18; // 18 seconds
    const buffer = ctx.createBuffer(2, sampleRate * sampleDuration, sampleRate);

    // Create an uplifting chord progression with melodic arpeggiation
    const chordFrequencies = [
      [261.63, 329.63, 392.0, 523.25], // C major
      [220.0, 261.63, 329.63, 440.0],  // A minor
      [174.61, 220.0, 261.63, 349.23], // F major
      [196.0, 246.94, 293.66, 392.0]   // G major
    ];

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const chordIndex = Math.floor(t / 4.5) % chordFrequencies.length;
        const notes = chordFrequencies[chordIndex];
        const noteIndex = Math.floor(t * 4) % notes.length;
        const freq = notes[noteIndex];

        // Synthesize soft sine + triangle harmonics with decay envelope
        const env = Math.exp(-((t * 4) % 1) * 3);
        const wave = Math.sin(2 * Math.PI * freq * t) * 0.4 +
                     Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.3;
        data[i] = wave * env * 0.5;
      }
    }

    setAudioBuffer(buffer);
    setFileName('whysogood_sample_melody.mp3');
    setFileSize(1024 * 320);
    setDuration(sampleDuration);
    setStartTime(2.5);
    setEndTime(14.8);
    setCurrentTime(2.5);
    toast.success('Loaded sample audio');
  };

  // Playback Control via Web Audio API
  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // already stopped
      }
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(
    (offsetSec?: number) => {
      if (!audioBuffer) return;
      stopPlayback();

      const ctx = getAudioContext();
      const startAt = offsetSec !== undefined ? offsetSec : currentTime;
      const validStart = startAt >= endTime || startAt < startTime ? startTime : startAt;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackSpeed;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volume / 100;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      playbackStartTimeRef.current = ctx.currentTime;
      playbackOffsetRef.current = validStart;

      // Play selection duration
      const playDuration = Math.max(0, endTime - validStart);
      source.start(0, validStart, playDuration);
      setIsPlaying(true);

      const updateLoop = () => {
        if (!sourceNodeRef.current) return;
        const elapsed = (ctx.currentTime - playbackStartTimeRef.current) * playbackSpeed;
        const currentPos = playbackOffsetRef.current + elapsed;

        if (currentPos >= endTime) {
          setCurrentTime(startTime);
          stopPlayback();
          return;
        }

        setCurrentTime(currentPos);
        animFrameRef.current = requestAnimationFrame(updateLoop);
      };

      animFrameRef.current = requestAnimationFrame(updateLoop);

      source.onended = () => {
        setIsPlaying(false);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    },
    [audioBuffer, currentTime, startTime, endTime, playbackSpeed, volume, getAudioContext, stopPlayback]
  );

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // Stop playback when unmounting or changing audioBuffer
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // Handle speed and volume changes during playback
  useEffect(() => {
    if (sourceNodeRef.current && gainNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = playbackSpeed;
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [playbackSpeed, volume]);

  // Draw the Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Number of bars
    const numBars = Math.floor(width / 3.5);
    const { min, max } = extractWaveformPeaks(audioBuffer, numBars);

    const centerY = height / 2;
    const maxAmplitude = height * 0.42;

    const startX = (startTime / duration) * width;
    const endX = (endTime / duration) * width;
    const playheadX = (currentTime / duration) * width;

    // 1. Draw Waveform Bars
    for (let i = 0; i < numBars; i++) {
      const x = (i / numBars) * width;
      const barWidth = 2;

      const peakMin = min[i];
      const peakMax = max[i];
      const topHeight = Math.max(2, Math.abs(peakMax) * maxAmplitude);
      const bottomHeight = Math.max(2, Math.abs(peakMin) * maxAmplitude);

      const isInSelection = x >= startX && x <= endX;

      // Color scheme exactly matches the screenshot: vibrant emerald green (#00e676 / #00ff87)
      if (isInSelection) {
        ctx.fillStyle = '#00ff87';
      } else {
        ctx.fillStyle = 'rgba(0, 255, 135, 0.25)'; // dimmed outside
      }

      // Draw top bar
      ctx.fillRect(x, centerY - topHeight, barWidth, topHeight);
      // Draw bottom bar
      ctx.fillRect(x, centerY, barWidth, bottomHeight);
    }

    // 2. Draw Selection Overlays
    // Left Dimmed Area
    if (startX > 0) {
      ctx.fillStyle = 'rgba(10, 20, 36, 0.72)';
      ctx.fillRect(0, 0, startX, height);
    }
    // Right Dimmed Area
    if (endX < width) {
      ctx.fillStyle = 'rgba(10, 20, 36, 0.72)';
      ctx.fillRect(endX, 0, width - endX, height);
    }

    // Active Selection Tint & Horizontal Border Glow
    const selectionWidth = Math.max(0, endX - startX);
    if (selectionWidth > 0) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
      ctx.fillRect(startX, 0, selectionWidth, height);

      // Top and bottom cyan border glow
      ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.fillRect(startX, 0, selectionWidth, 1.5);
      ctx.fillRect(startX, height - 1.5, selectionWidth, 1.5);
    }

    // 3. Draw Left Selection Handle (Cyan bar with 3 vertical dots)
    const handleWidth = 14;
    ctx.fillStyle = '#00e5ff';

    // Left handle body
    ctx.beginPath();
    ctx.roundRect(startX, 0, handleWidth, height, [6, 0, 0, 6]);
    ctx.fill();

    // 3 grip dots
    ctx.fillStyle = '#002233';
    for (let d = -1; d <= 1; d++) {
      ctx.beginPath();
      ctx.arc(startX + handleWidth / 2, centerY + d * 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Right Selection Handle
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.roundRect(endX - handleWidth, 0, handleWidth, height, [0, 6, 6, 0]);
    ctx.fill();

    ctx.fillStyle = '#002233';
    for (let d = -1; d <= 1; d++) {
      ctx.beginPath();
      ctx.arc(endX - handleWidth / 2, centerY + d * 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Draw Playhead line if inside view
    if (playheadX >= 0 && playheadX <= width) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playheadX - 1, 0, 2, height);

      // Top triangle indicator
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 6);
      ctx.closePath();
      ctx.fill();
    }
  }, [audioBuffer, duration, startTime, endTime, currentTime]);

  // Update canvas size on container resize
  useEffect(() => {
    const updateCanvasDimensions = () => {
      const container = trackContainerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 140 * dpr; // 140px track height
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `140px`;
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [audioBuffer]);

  // Pointer Interaction Handlers for Waveform & Handles
  const getTimeFromPointerX = (clientX: number): number => {
    const container = trackContainerRef.current;
    if (!container || duration === 0) return 0;
    const rect = container.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!audioBuffer) return;
    const container = trackContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration;

    const startX = (startTime / duration) * rect.width;
    const endX = (endTime / duration) * rect.width;
    const handleThreshold = 20;

    // Check if clicked Left Handle
    if (Math.abs(clickX - startX) <= handleThreshold) {
      setDragTarget('start');
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
    // Check if clicked Right Handle
    else if (Math.abs(clickX - endX) <= handleThreshold) {
      setDragTarget('end');
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
    // Check if clicked inside Selection Body (move range)
    else if (clickX > startX && clickX < endX) {
      setDragTarget('range');
      dragStartXRef.current = e.clientX;
      dragStartTimeRef.current = startTime;
      dragEndTimeRef.current = endTime;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
    // Clicked outside selection: seek playhead
    else {
      setCurrentTime(clickTime);
      if (isPlaying) {
        startPlayback(clickTime);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!audioBuffer) return;
    const container = trackContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const startX = (startTime / duration) * rect.width;
    const endX = (endTime / duration) * rect.width;

    // Cursor styling
    if (Math.abs(currentX - startX) <= 15) {
      setHoveredHandle('start');
    } else if (Math.abs(currentX - endX) <= 15) {
      setHoveredHandle('end');
    } else {
      setHoveredHandle(null);
    }

    if (!dragTarget) return;

    const targetTime = getTimeFromPointerX(e.clientX);

    if (dragTarget === 'start') {
      const newStart = Math.max(0, Math.min(targetTime, endTime - 0.1));
      setStartTime(newStart);
      setCurrentTime(newStart);
    } else if (dragTarget === 'end') {
      const newEnd = Math.min(duration, Math.max(targetTime, startTime + 0.1));
      setEndTime(newEnd);
    } else if (dragTarget === 'range') {
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaTime = (deltaX / rect.width) * duration;
      const rangeDuration = dragEndTimeRef.current - dragStartTimeRef.current;

      let newStart = dragStartTimeRef.current + deltaTime;
      let newEnd = dragEndTimeRef.current + deltaTime;

      if (newStart < 0) {
        newStart = 0;
        newEnd = rangeDuration;
      }
      if (newEnd > duration) {
        newEnd = duration;
        newStart = duration - rangeDuration;
      }

      setStartTime(newStart);
      setEndTime(newEnd);
      setCurrentTime(newStart);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragTarget(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Reset to full duration
  const handleReset = () => {
    if (!audioBuffer) return;
    stopPlayback();
    setStartTime(0);
    setEndTime(duration);
    setCurrentTime(0);
    setFadeIn(false);
    setFadeOut(false);
    setCutMode('keep');
    setPlaybackSpeed(1.0);
    setVolume(100);
    toast.success('Reset selection to full track');
  };

  // Close / Clear file
  const handleClose = () => {
    stopPlayback();
    setFile(null);
    setAudioBuffer(null);
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
  };

  // Save / Export Trimmed Audio
  const handleSave = async () => {
    if (!audioBuffer) return;
    stopPlayback();
    setIsProcessing(true);

    try {
      let processed: AudioBuffer;

      // 1. Cut or Trim buffer
      if (cutMode === 'keep') {
        processed = trimAudioBuffer(audioBuffer, startTime, endTime);
      } else {
        processed = cutOutAudioBuffer(audioBuffer, startTime, endTime);
      }

      // 2. Apply Fade In / Fade Out if enabled
      if (fadeIn || fadeOut) {
        const fadeDuration = Math.min(2.0, processed.duration * 0.25);
        processed = applyFade(processed, fadeIn ? fadeDuration : 0, fadeOut ? fadeDuration : 0);
      }

      // 3. Apply Volume if adjusted
      if (volume !== 100) {
        processed = changeVolume(processed, volume / 100);
      }

      // 4. Encode to WAV Blob
      const wavBlob = audioBufferToWav(processed);
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}_cut.${exportFormat === 'mp3' ? 'mp3' : 'wav'}`;

      downloadBlob(wavBlob, downloadName);
      toast.success(`Successfully saved "${downloadName}"`);
    } catch {
      toast.error('Failed to process and export audio');
    } finally {
      setIsProcessing(false);
    }
  };

  // Stepper adjustments for Start / End inputs
  const stepStartTime = (delta: number) => {
    const next = Math.max(0, Math.min(endTime - 0.1, Math.round((startTime + delta) * 10) / 10));
    setStartTime(next);
    setCurrentTime(next);
  };

  const stepEndTime = (delta: number) => {
    const next = Math.min(duration, Math.max(startTime + 0.1, Math.round((endTime + delta) * 10) / 10));
    setEndTime(next);
  };

  // Handle manual input text editing
  const handleStartInputChange = (val: string) => {
    const parsed = parseAudioTimestamp(val);
    if (!isNaN(parsed) && parsed >= 0 && parsed < endTime) {
      setStartTime(parsed);
      setCurrentTime(parsed);
    }
  };

  const handleEndInputChange = (val: string) => {
    const parsed = parseAudioTimestamp(val);
    if (!isNaN(parsed) && parsed > startTime && parsed <= duration) {
      setEndTime(parsed);
    }
  };

  // Handle Drag & Drop on Initial Upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadAudioFile(e.dataTransfer.files[0]);
    }
  };

  // Calculate percentage positions for handle floating pills
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '980px', margin: '0 auto' }}>
      {/* ── Initial Upload Screen (If no file is loaded) ── */}
      {!audioBuffer && (
        <div className="c-card" style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              {toolTitle}
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Cut, trim, fade, and edit audio tracks with visual interactive waveform scrubbing entirely in your browser.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && loadAudioFile(e.target.files[0])}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              padding: '48px 24px',
              borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--border)',
              backgroundColor: 'var(--bg-3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'border-color var(--transition-fast)'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(21, 128, 209, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Scissors size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 'var(--text-body-lg)' }}>
                Choose an audio file or drag & drop here
              </div>
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', marginTop: '4px' }}>
                Supports MP3, WAV, OGG, AAC, M4A, FLAC, and WebM (any length)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button variant="ghost" size="sm" onClick={loadSampleAudio}>
              <Sparkles size={16} /> Try with Sample Audio
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Interactive Editor View (Matches the User's Screenshot) ── */}
      {audioBuffer && (
        <div
          style={{
            backgroundColor: '#0c1a30', // Deep rich navy matching the screenshot
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)'
          }}
        >
          {/* 1. TOP HEADER BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Left Tool Tabs (Trim, Volume, Speed, Pitch) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('trim')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'trim' ? '#1a365d' : 'transparent',
                  color: activeTab === 'trim' ? '#00e5ff' : '#94a3b8',
                  border: activeTab === 'trim' ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Scissors size={15} />
                <span>Trim</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'volume' ? 'trim' : 'volume')}
                title="Adjust Volume"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'volume' ? '#1a365d' : 'transparent',
                  color: activeTab === 'volume' ? '#00e5ff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Volume2 size={16} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'speed' ? 'trim' : 'speed')}
                title="Playback Speed"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'speed' ? '#1a365d' : 'transparent',
                  color: activeTab === 'speed' ? '#00e5ff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Gauge size={16} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'equalizer' ? 'trim' : 'equalizer')}
                title="Equalizer & Effects"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: activeTab === 'equalizer' ? '#1a365d' : 'transparent',
                  color: activeTab === 'equalizer' ? '#00e5ff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Sliders size={16} />
              </button>
            </div>

            {/* Right Action Buttons (Reset, Close) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                title="Close file"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Sub-tools Popover Panel (Volume, Speed, Equalizer) */}
          {activeTab === 'volume' && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(15, 23, 42, 0.65)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Volume ({volume}%):</span>
              <input
                type="range"
                min="0"
                max="200"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--brand)' }}
              />
              <span style={{ fontSize: '13px', color: '#94a3b8', width: '40px' }}>{volume}%</span>
            </div>
          )}

          {activeTab === 'speed' && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(15, 23, 42, 0.65)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Playback Speed:</span>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: playbackSpeed === spd ? '#1a365d' : 'transparent',
                    color: playbackSpeed === spd ? '#00e5ff' : '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          )}

          {/* 2. CENTRAL WAVEFORM TRACK AREA */}
          <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Top Info Bar inside Track */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '24px', position: 'relative' }}>
              {/* Floating Pill on Left Handle (e.g. 00:00.0) */}
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.min(92, Math.max(0, startPercent))}%`,
                  bottom: '2px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  padding: '1px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  pointerEvents: 'none',
                  transform: 'translateX(-50%)',
                  zIndex: 10
                }}
              >
                {formatAudioTimestamp(startTime)}
              </div>

              {/* Centered File Name */}
              <span
                style={{
                  fontSize: '12px',
                  color: '#38bdf8',
                  fontWeight: 500,
                  letterSpacing: '0.2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '60%'
                }}
              >
                {fileName}
              </span>
            </div>

            {/* Canvas Viewport Container */}
            <div
              ref={trackContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: 'relative',
                width: '100%',
                height: '140px',
                backgroundColor: '#10223f',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: hoveredHandle ? 'ew-resize' : dragTarget ? 'ew-resize' : 'crosshair',
                touchAction: 'none',
                userSelect: 'none'
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />

              {/* Floating Center Time Indicator inside Waveform */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8',
                  pointerEvents: 'none'
                }}
              >
                {formatAudioTimestamp(endTime - startTime)}
              </div>
            </div>

            {/* Bottom Track Time Markers */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: '#38bdf8',
                marginTop: '4px',
                padding: '0 2px'
              }}
            >
              <span>{formatAudioTimestamp(0)}</span>
              <span>{formatAudioTimestamp(duration)}</span>
            </div>
          </div>

          {/* 3. BOTTOM CONTROL BAR */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              paddingTop: '8px'
            }}
          >
            {/* Left Controls: Play, Fade, Cut Mode, Numeric Inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Play / Pause Button */}
              <button
                type="button"
                onClick={togglePlay}
                style={{
                  width: '56px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color var(--transition-fast)'
                }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
              </button>

              {/* Fade Toggle Button (Curve Icon) */}
              <button
                type="button"
                onClick={() => {
                  const nextFade = !(fadeIn && fadeOut);
                  setFadeIn(nextFade);
                  setFadeOut(nextFade);
                  toast.success(nextFade ? 'Fade In & Fade Out enabled' : 'Fade disabled');
                }}
                style={{
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: fadeIn || fadeOut ? '#1a365d' : '#1e293b',
                  color: fadeIn || fadeOut ? '#00e5ff' : '#94a3b8',
                  border: fadeIn || fadeOut ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
                title="Toggle Fade In & Fade Out"
              >
                {/* SVG curve matching the screenshot icon */}
                <svg width="24" height="16" viewBox="0 0 32 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 14 C 8 14, 10 2, 16 2 C 22 2, 24 14, 30 14" strokeLinecap="round" />
                </svg>
              </button>

              {/* Cut Mode Toggle: Keep Selection vs Remove Selection */}
              <button
                type="button"
                onClick={() => {
                  const nextMode = cutMode === 'keep' ? 'remove' : 'keep';
                  setCutMode(nextMode);
                  toast.success(nextMode === 'keep' ? 'Mode: Keep Selection' : 'Mode: Cut Out (Remove Selection)');
                }}
                style={{
                  height: '44px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: cutMode === 'remove' ? '#1a365d' : '#1e293b',
                  color: cutMode === 'remove' ? '#00e5ff' : '#94a3b8',
                  border: cutMode === 'remove' ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={cutMode === 'keep' ? 'Keep Selection' : 'Cut Out (Remove Selection)'}
              >
                {/* Two vertical bars with gap */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ width: '3px', height: '14px', backgroundColor: 'currentColor', borderRadius: '1px' }} />
                  <span style={{ width: '4px', height: '2px', backgroundColor: 'currentColor' }} />
                  <span style={{ width: '3px', height: '14px', backgroundColor: 'currentColor', borderRadius: '1px' }} />
                </div>
              </button>

              {/* Start Time & End Time Numeric Inputs with Steppers */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#1e293b',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '4px 8px',
                  height: '44px',
                  gap: '8px'
                }}
              >
                {/* Start Time Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    value={formatAudioTimestamp(startTime)}
                    onChange={(e) => handleStartInputChange(e.target.value)}
                    style={{
                      width: '64px',
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => stepStartTime(0.1)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepStartTime(-0.1)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>

                <span style={{ color: '#475569' }}>|</span>

                {/* End Time Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    value={formatAudioTimestamp(endTime)}
                    onChange={(e) => handleEndInputChange(e.target.value)}
                    style={{
                      width: '64px',
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => stepEndTime(0.1)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepEndTime(-0.1)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Controls: Format Selector & Save Primary Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Format selector pill dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{
                    appearance: 'none',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 28px 0 14px',
                    height: '44px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {allowedFormats.map((fmt) => (
                    <option key={fmt} value={fmt} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      {fmt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}
                />
              </div>

              {/* Rule 2: Strictly max 1 primary button per view (class="c-btn c-btn--primary") */}
              <button
                type="button"
                className="c-btn c-btn--primary"
                onClick={handleSave}
                disabled={isProcessing}
                style={{
                  height: '44px',
                  padding: '0 28px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '96px',
                  justifyContent: 'center'
                }}
              >
                {isProcessing ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
