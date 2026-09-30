'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { removeDuplicateLines } from '@/lib/text/engines';

export default function RemoveDuplicateLinesTool() {
  const [text, setText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const toast = useToast();

  const { result, duplicatesRemoved, uniqueLines } = useMemo(() => {
    return removeDuplicateLines(text, caseSensitive);
  }, [text, caseSensitive]);

  const loadSample = () => {
    setText('apple\nbanana\nApple\norange\nBANANA\ngrape\napple');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-transparent p-3 rounded border" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-sm">Removed {duplicatesRemoved} duplicate lines — {uniqueLines} unique remain</span>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
            Case Sensitive
          </label>
          <Button variant="ghost" size="sm" onClick={loadSample}>Load Sample</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Original</span>
          <textarea
            className="w-full p-3 border rounded bg-transparent min-h-[400px]"
            style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
            value={text}
            onChange={(e: any) => setText(e.target.value)}
            placeholder="Enter lines..."
          />
        </div>
        <div className="flex flex-col gap-2 relative">
          <span className="text-sm font-medium flex justify-between">
            <span>Result</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(result); toast.success('Copied!'); }}>Copy</Button>
              <Button variant="ghost" size="sm" icon={<Download size={14}/>} onClick={() => downloadBlob(new Blob([result], {type: 'text/plain'}), 'deduped.txt')}>Download</Button>
            </div>
          </span>
          <textarea
            className="w-full p-3 border rounded bg-transparent min-h-[400px]"
            style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
            value={result}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
