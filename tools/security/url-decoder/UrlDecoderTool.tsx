'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { urlDecode } from '@/lib/security/engines';
import { copyToClipboard } from '@/lib/utils';

export default function UrlDecoderTool() {
  const [input, setInput] = useState('');
  const toast = useToast();
  const decoded = urlDecode(input);

  return (
    <div className="card flex flex-col gap-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="URL to decode..." className="w-full h-32 p-2" />
      <textarea value={decoded} readOnly className="w-full h-32 p-2 bg-surface2" />
      <Button onClick={() => { copyToClipboard(decoded); toast.success('Copied'); }} variant="primary">Copy Decoded</Button>
    </div>
  );
}
