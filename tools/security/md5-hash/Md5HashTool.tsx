'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { md5 } from '@/lib/security/engines';
import { copyToClipboard } from '@/lib/utils';

export default function Md5HashTool() {
  const [input, setInput] = useState('');
  const [hash, setHash] = useState('');
  const [upper, setUpper] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let h = md5(input);
    if (upper) h = h.toUpperCase();
    setHash(h);
  }, [input, upper]);

  return (
    <div className="card flex flex-col gap-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Input text..." className="w-full h-32 p-2" />
      <label><input type="checkbox" checked={upper} onChange={e => setUpper(e.target.checked)} /> Uppercase</label>
      <div className="p-4 bg-surface2 font-mono break-all rounded">{hash}</div>
      <Button onClick={() => { copyToClipboard(hash); toast.success('Copied'); }} variant="primary">Copy Hash</Button>
    </div>
  );
}
