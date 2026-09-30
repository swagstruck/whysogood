'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { getTimestamps, timestampToDate } from '@/lib/generators/engines';
import { copyToClipboard } from '@/lib/utils';

export default function TimestampGeneratorTool() {
  const [now, setNow] = useState(getTimestamps());
  const [input, setInput] = useState('');
  const toast = useToast();

  useEffect(() => {
    const int = setInterval(() => setNow(getTimestamps()), 1000);
    return () => clearInterval(int);
  }, []);

  const parsed = input ? (isNaN(Number(input)) ? null : timestampToDate(Number(input))) : null;

  const copy = (val: string) => { copyToClipboard(val); toast.success('Copied'); };

  return (
    <div className="card space-y-4">
      <div>
        <h3 className="font-bold mb-2">Current Time</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Unix: {now.unix} <Button onClick={()=>copy(String(now.unix))} variant="ghost">Copy</Button></div>
          <div>ISO: {now.iso} <Button onClick={()=>copy(now.iso)} variant="ghost">Copy</Button></div>
          <div>Local: {now.local}</div>
        </div>
      </div>
      <hr className="border-border" />
      <div>
        <label className="block mb-2 font-bold">Parse Unix Timestamp</label>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. 1700000000" className="w-full p-2 mb-2" />
        {parsed && (
          <div className="text-sm space-y-1">
            <div>ISO: {parsed.iso}</div>
            <div>UTC: {parsed.utc}</div>
            <div>Local: {parsed.local}</div>
          </div>
        )}
      </div>
    </div>
  );
}
