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
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AudioDropzone onFile={handleFile} accept="audio/mpeg,audio/wav,audio/ogg" label="Drop audio file (MP3/WAV/OGG) here" />
      {file && buffer && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">{file?.name}</h3>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Duration: {buffer.duration.toFixed(2)}s</p>
          <div className="h-4 bg-surface2 rounded relative overflow-hidden" style={{ background: 'var(--color-surface2)' }}>
            <div className="absolute h-full rounded" style={{ left: `${(startTime / buffer.duration) * 100}%`, right: `${100 - (endTime / buffer.duration) * 100}%`, backgroundColor: 'var(--color-accent)' }}></div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm">Start Time (s)</label>
              <input type="number" value={startTime} onChange={(e) => setStartTime(Number(e.target.value))} min={0} max={endTime} step={0.1} className="p-2 rounded border" style={{ borderColor: 'var(--color-border)', background: 'transparent' }} />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm">End Time (s)</label>
              <input type="number" value={endTime} onChange={(e) => setEndTime(Number(e.target.value))} min={startTime} max={buffer.duration} step={0.1} className="p-2 rounded border" style={{ borderColor: 'var(--color-border)', background: 'transparent' }} />
            </div>
          </div>
          <button onClick={handleTrim} disabled={processing} className="px-4 py-2 rounded font-medium" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
            {processing ? 'Processing...' : 'Trim'}
          </button>
        </div>
      )}
      {outputUrl && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Output</h3>
          <audio controls src={outputUrl} className="w-full" />
          <button onClick={() => downloadBlob(outputBlob!, 'trimmed.wav')} className="px-4 py-2 rounded font-medium bg-black text-white dark:bg-white dark:text-black">
            Download WAV
          </button>
        </div>
      )}
    </div>
  );
}
