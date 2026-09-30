'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { decodeJwtSec } from '@/lib/security/engines';

export default function JwtDecoderSecTool() {
  const [input, setInput] = useState('');
  const decoded = decodeJwtSec(input);

  return (
    <div className="card flex flex-col gap-4">
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste JWT here..." className="w-full h-32 p-2 font-mono text-sm" />
      {decoded ? (
        <div className="space-y-4">
          <div className="bg-surface2 p-4 rounded"><h4 className="font-bold">Header</h4><pre className="text-xs overflow-auto">{JSON.stringify(decoded.header, null, 2)}</pre></div>
          <div className="bg-surface2 p-4 rounded"><h4 className="font-bold">Payload</h4><pre className="text-xs overflow-auto">{JSON.stringify(decoded.payload, null, 2)}</pre></div>
          <div className="text-sm">Expired: {decoded.isExpired ? <span className="text-danger font-bold">Yes</span> : <span className="text-success font-bold">No</span>}</div>
        </div>
      ) : (
        input && <div className="text-danger">Invalid JWT</div>
      )}
    </div>
  );
}
