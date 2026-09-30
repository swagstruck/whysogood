'use client';
import React, { useState } from 'react';
import AudioDropzone from '../common/AudioDropzone';
import { audioBufferToWav, mergeAudioBuffers, decodeAudio } from '@/lib/audio/engines';
import { downloadBlob, readFileAsArrayBuffer } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { ArrowUp, ArrowDown, X } from 'lucide-react';

export default function AudioMergerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const toast = useToast();

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    setOutputUrl(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const arr = [...prev];
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      return arr;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast.success('Please add at least 2 files');
      return;
    }
    setProcessing(true);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffers = [];
      for (const f of files) {
        const ab = await readFileAsArrayBuffer(f);
        const decoded = await decodeAudio(ab, ctx);
        buffers.push(decoded);
      }
      const merged = mergeAudioBuffers(buffers);
      const wavBlob = audioBufferToWav(merged);
      setOutputBlob(wavBlob); setOutputUrl(URL.createObjectURL(wavBlob));
      toast.success('Merged successfully!');
    } catch (err) {
      toast.error('Error merging audio');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AudioDropzone onFiles={handleFiles} accept="audio/*" multiple label="Drop multiple audio files here" />
      {files.length > 0 && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Files to merge</h3>
          <div className="flex flex-col gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: 'var(--color-border)' }}>
                <span className="truncate flex-1">{f.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 hover:bg-surface2 rounded"><ArrowUp size={16} /></button>
                  <button onClick={() => moveDown(i)} disabled={i === files.length - 1} className="p-1 hover:bg-surface2 rounded"><ArrowDown size={16} /></button>
                  <button onClick={() => removeFile(i)} className="p-1 text-red-500 hover:bg-surface2 rounded"><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleMerge} disabled={processing || files.length < 2} className="px-4 py-2 rounded font-medium" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
            {processing ? 'Processing...' : 'Merge'}
          </button>
        </div>
      )}
      {outputUrl && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Output</h3>
          <audio controls src={outputUrl} className="w-full" />
          <button onClick={() => downloadBlob(outputBlob!, 'merged.wav')} className="px-4 py-2 rounded font-medium bg-black text-white dark:bg-white dark:text-black">
            Download WAV
          </button>
        </div>
      )}
    </div>
  );
}
