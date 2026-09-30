'use client';
import React, { useState } from 'react';
import AudioDropzone from '../common/AudioDropzone';
import { audioBufferToWav, trimAudioBuffer, decodeAudio } from '@/lib/audio/engines';
import { downloadBlob, readFileAsArrayBuffer } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function AudioTrimmerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const toast = useToast();

  const handleFile = async (f: File) => {
    setFile(f);
    setOutputUrl(null);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(f);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await decodeAudio(arrayBuffer, ctx);
      setBuffer(decoded);
      setStartTime(0);
      setEndTime(decoded.duration);
    } catch (err) {
      toast.error('Error decoding audio');
    }
  };

  const handleTrim = () => {
    if (!buffer) return;
    setProcessing(true);
    try {
      const trimmed = trimAudioBuffer(buffer, startTime, endTime);
      const wavBlob = audioBufferToWav(trimmed);
      setOutputBlob(wavBlob); setOutputUrl(URL.createObjectURL(wavBlob));
      toast.success('Trimmed successfully!');
    } catch (err) {
      toast.error('Error trimming audio');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680, margin: '0 auto' }}>
      <AudioDropzone onFile={handleFile} accept="audio/mpeg,audio/wav,audio/ogg" label="Drop audio file (MP3/WAV/OGG) here" />
      {file && buffer && (
        <div className="c-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{file?.name}</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>Duration: {buffer.duration.toFixed(2)}s</p>
          <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 'var(--radius-full)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 'var(--radius-full)', left: `${(startTime / buffer.duration) * 100}%`, right: `${100 - (endTime / buffer.duration) * 100}%`, background: 'var(--brand)' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Start Time (s)</label>
              <input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                min={0}
                max={endTime}
                step={0.1}
                className="input-base"
                style={{ height: 40, padding: '0 12px', borderRadius: 'var(--radius-md)', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>End Time (s)</label>
              <input
                type="number"
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
                min={startTime}
                max={buffer.duration}
                step={0.1}
                className="input-base"
                style={{ height: 40, padding: '0 12px', borderRadius: 'var(--radius-md)', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <button
            onClick={handleTrim}
            disabled={processing}
            className="c-btn c-btn--primary"
            style={{ width: '100%', height: 42 }}
          >
            {processing ? 'Processing...' : 'Trim'}
          </button>
        </div>
      )}
      {outputUrl && (
        <div className="c-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Output</h3>
          <audio controls src={outputUrl} style={{ width: '100%' }} />
          <button
            onClick={() => downloadBlob(outputBlob!, 'trimmed.wav')}
            className="c-btn c-btn--primary"
            style={{ width: '100%', height: 42 }}
          >
            Download WAV
          </button>
        </div>
      )}
    </div>
  );
}
