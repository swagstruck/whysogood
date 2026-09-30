'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { sortLines } from '@/lib/text/engines';

export default function SortLinesTool() {
  const [text, setText] = useState('');
  const [direction, setDirection] = useState<'asc'|'desc'>('asc');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [trimLines, setTrimLines] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(false);
  const toast = useToast();

  const result = useMemo(() => {
    return sortLines(text, direction, caseSensitive, trimLines, removeEmpty);
  }, [text, direction, caseSensitive, trimLines, removeEmpty]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 p-4 border rounded" style={{ borderColor: 'var(--color-border)' }}>
        <Select 
          value={direction} 
          onChange={(e: any) => setDirection(e.target.value as 'asc'|'desc')}
          options={[{label: 'A → Z', value: 'asc'}, {label: 'Z → A', value: 'desc'}]}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
          Case Sensitive
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={trimLines} onChange={e => setTrimLines(e.target.checked)} />
          Trim Lines
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={removeEmpty} onChange={e => setRemoveEmpty(e.target.checked)} />
          Remove Empty
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <textarea
          className="w-full p-3 border rounded bg-transparent min-h-[400px]"
          style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
          value={text}
          onChange={(e: any) => setText(e.target.value)}
          placeholder="Enter lines to sort..."
        />
        <div className="relative">
          <div className="absolute top-2 right-2 flex gap-2">
            <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(result); toast.success('Copied!'); }}>Copy</Button>
            <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => downloadBlob(new Blob([result], {type: 'text/plain'}), 'sorted.txt')}>Download</Button>
          </div>
          <textarea
            className="w-full p-3 border rounded bg-transparent min-h-[400px] pt-12"
            style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
            value={result}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
