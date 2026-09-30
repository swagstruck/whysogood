'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { urlEncode } from '@/lib/security/engines';
import { copyToClipboard } from '@/lib/utils';

export default function UrlEncoderTool() {
  const [input, setInput] = useState('');
  const toast = useToast();
  const encoded = urlEncode(input);

  return (
    <div className="card flex flex-col gap-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Text to encode..." className="w-full h-32 p-2" />
      <textarea value={encoded} readOnly className="w-full h-32 p-2 bg-surface2" />
      <Button onClick={() => { copyToClipboard(encoded); toast.success('Copied'); }} variant="primary">Copy Encoded</Button>
    </div>
  );
}
