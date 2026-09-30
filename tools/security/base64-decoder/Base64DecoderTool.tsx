'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { base64Decode, base64DecodeToBytes } from '@/lib/security/engines';
import { copyToClipboard, downloadBlob } from '@/lib/utils';

export default function Base64DecoderTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  const handleDecode = () => {
    try {
      setOutput(base64Decode(input));
      setError('');
    } catch (e) {
      setError('Invalid Base64');
      setOutput('');
    }
  };

  return (
    <div className="card flex flex-col gap-4">
      <textarea value={input} onChange={e => { setInput(e.target.value); handleDecode(); }} placeholder="Base64 string..." className="w-full h-32 p-2 font-mono" />
      <Button onClick={handleDecode} variant="primary">Decode</Button>
      {error && <div className="text-danger">{error}</div>}
      <textarea value={output} readOnly className="w-full h-32 p-2 font-mono bg-surface2" />
      <div className="flex gap-2">
        <Button onClick={() => { copyToClipboard(output); toast.success('Copied'); }} variant="secondary">Copy Text</Button>
        <Button onClick={() => {
          try {
            const bytes = base64DecodeToBytes(input);
            downloadBlob(new Blob([bytes as any]), 'decoded.bin');
            toast.success('Downloaded');
          } catch(e) { toast.error('Error'); }
        }} variant="secondary">Download Binary</Button>
      </div>
    </div>
  );
}
