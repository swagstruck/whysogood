'use client';
import React, { useState } from 'react';
import AudioDropzone from '../common/AudioDropzone';
import { audioBufferToWav, decodeAudio } from '@/lib/audio/engines';
import { downloadBlob, readFileAsArrayBuffer } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function Mp3ToWavTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const toast = useToast();

  const handleFile = async (f: File) => {
    setFile(f);
    setOutputUrl(null);
    setOutputBlob(null);
    setProcessing(true);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(f);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await decodeAudio(arrayBuffer, ctx);
      const wavBlob = audioBufferToWav(decoded);
      setOutputBlob(wavBlob);
      setOutputBlob(wavBlob); setOutputUrl(URL.createObjectURL(wavBlob));
      toast.success('Converted to WAV successfully!');
    } catch (err) {
      toast.error('Error converting audio');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AudioDropzone onFile={handleFile} accept="audio/mpeg" label="Drop MP3 file here to convert to WAV" />
      {processing && (
        <div className="text-center" style={{ color: 'var(--color-muted)' }}>Converting...</div>
      )}
      {file && outputUrl && outputBlob && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Conversion Result</h3>
          <div className="flex justify-between text-sm">
            <span>Input: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <span>Output: {(outputBlob.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <audio controls src={outputUrl} className="w-full" />
          <button onClick={() => downloadBlob(outputBlob!, (file?.name || 'audio').replace(/\.mp3$/i, '.wav'))} className="px-4 py-2 rounded font-medium bg-black text-white dark:bg-white dark:text-black">
            Download WAV
          </button>
        </div>
      )}
    </div>
  );
}
