'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { reverseChars, reverseWords, reverseLines } from '@/lib/text/engines';

export default function ReverseTextTool() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'chars' | 'words' | 'lines'>('chars');
  const toast = useToast();

  const result = useMemo(() => {
    switch(mode) {
      case 'chars': return reverseChars(text);
      case 'words': return reverseWords(text);
      case 'lines': return reverseLines(text);
      default: return text;
    }
  }, [text, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === 'chars' ? 'primary' : 'secondary'} onClick={() => setMode('chars')}>Reverse Characters</Button>
        <Button variant={mode === 'words' ? 'primary' : 'secondary'} onClick={() => setMode('words')}>Reverse Words</Button>
        <Button variant={mode === 'lines' ? 'primary' : 'secondary'} onClick={() => setMode('lines')}>Reverse Lines</Button>
      </div>

      <textarea
        className="w-full p-3 border rounded bg-transparent min-h-[200px]"
        style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
        value={text}
        onChange={(e: any) => setText(e.target.value)}
        placeholder="Enter text to reverse..."
      />

      <div className="relative">
        <textarea
          className="w-full p-3 border rounded bg-transparent min-h-[200px]"
          style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
          value={result}
          readOnly
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(result); toast.success('Copied!'); }}>Copy</Button>
          <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => downloadBlob(new Blob([result], {type: 'text/plain'}), 'reversed.txt')}>Download</Button>
        </div>
      </div>
    </div>
  );
}
