'use client';
import React, { useState } from 'react';
import AudioDropzone from '../common/AudioDropzone';
import { audioBufferToWav, changeVolume, decodeAudio } from '@/lib/audio/engines';
import { downloadBlob, readFileAsArrayBuffer } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function AudioVolumeTool() {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [multiplier, setMultiplier] = useState(1);
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
    } catch (err) {
      toast.error('Error decoding audio');
    }
  };

  const handleProcess = () => {
    if (!buffer) return;
    setProcessing(true);
    try {
      const newBuffer = changeVolume(buffer, multiplier);
      const wavBlob = audioBufferToWav(newBuffer);
      setOutputBlob(wavBlob); setOutputUrl(URL.createObjectURL(wavBlob));
      toast.success('Volume changed successfully!');
    } catch (err) {
      toast.error('Error changing volume');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AudioDropzone onFile={handleFile} accept="audio/*" label="Drop audio file here" />
      {file && buffer && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">{file?.name}</h3>
          <div className="flex flex-col gap-2">
            <label className="text-sm">Volume Multiplier: {multiplier.toFixed(1)}x</label>
            <input type="range" min={0.1} max={3} step={0.1} value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
              <span>0.1x</span>
              <span>1.0x (Original)</span>
              <span>3.0x</span>
            </div>
          </div>
          <button onClick={handleProcess} disabled={processing} className="px-4 py-2 rounded font-medium" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
            {processing ? 'Processing...' : 'Apply Volume Change'}
          </button>
        </div>
      )}
      {outputUrl && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Output</h3>
          <audio controls src={outputUrl} className="w-full" />
          <button onClick={() => downloadBlob(outputBlob!, 'volume_changed.wav')} className="px-4 py-2 rounded font-medium bg-black text-white dark:bg-white dark:text-black">
            Download WAV
          </button>
        </div>
      )}
    </div>
  );
}
