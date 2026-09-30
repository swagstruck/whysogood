'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { sha512 } from '@/lib/security/engines';
import { copyToClipboard } from '@/lib/utils';

export default function Sha512HashTool() {
  const [input, setInput] = useState('');
  const [hash, setHash] = useState('');
  const toast = useToast();

  useEffect(() => {
    sha512(input).then(setHash);
  }, [input]);

  return (
    <div className="card flex flex-col gap-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Input text..." className="w-full h-32 p-2" />
      <div className="p-4 bg-surface2 font-mono break-all rounded">{hash}</div>
      <Button onClick={() => { copyToClipboard(hash); toast.success('Copied'); }} variant="primary">Copy Hash</Button>
    </div>
  );
}
