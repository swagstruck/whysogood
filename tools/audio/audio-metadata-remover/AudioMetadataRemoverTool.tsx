'use client';
import React, { useState } from 'react';
import AudioDropzone from '../common/AudioDropzone';
import { stripId3Tags } from '@/lib/audio/engines';
import { downloadBlob, readFileAsArrayBuffer } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function AudioMetadataRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [metadataSize, setMetadataSize] = useState(0);
  const toast = useToast();

  const handleFile = async (f: File) => {
    setFile(f);
    setOutputUrl(null);
    setOutputBlob(null);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(f);
      setBuffer(arrayBuffer);
      // estimate metadata size (ID3v2)
      const view = new DataView(arrayBuffer);
      if (arrayBuffer.byteLength > 10 && view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
        const size = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9);
        setMetadataSize(size + 10);
      } else {
        setMetadataSize(0);
      }
    } catch (err) {
      toast.error('Error reading file');
    }
  };

  const handleProcess = () => {
    if (!buffer) return;
    setProcessing(true);
    try {
      const cleanedBuffer = stripId3Tags(buffer);
      const blob = new Blob([cleanedBuffer], { type: 'audio/mpeg' });
      setOutputBlob(blob);
      setOutputUrl(URL.createObjectURL(blob));
      toast.success('Metadata removed successfully!');
    } catch (err) {
      toast.error('Error processing file');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <AudioDropzone onFile={handleFile} accept="audio/mpeg" label="Drop MP3 file here" />
      {file && buffer && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">{file?.name}</h3>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Original Size: {(file.size / 1024).toFixed(2)} KB</p>
          {metadataSize > 0 ? (
            <p className="text-sm text-yellow-600">ID3 Tags found: ~{(metadataSize / 1024).toFixed(2)} KB</p>
          ) : (
            <p className="text-sm text-green-600">No ID3v2 tags detected at the beginning of the file.</p>
          )}
          <button onClick={handleProcess} disabled={processing} className="px-4 py-2 rounded font-medium" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
            {processing ? 'Processing...' : 'Remove Metadata'}
          </button>
        </div>
      )}
      {outputUrl && outputBlob && (
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Output</h3>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Cleaned Size: {(outputBlob.size / 1024).toFixed(2)} KB</p>
          <button onClick={() => downloadBlob(outputBlob!, (file?.name || 'audio').replace(/\.mp3$/i, '_clean.mp3'))} className="px-4 py-2 rounded font-medium bg-black text-white dark:bg-white dark:text-black">
            Download Clean MP3
          </button>
        </div>
      )}
    </div>
  );
}
