'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { removeWhitespace, WhitespaceOptions } from '@/lib/text/engines';

export default function WhitespaceRemoverTool() {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<WhitespaceOptions>({
    trimLeading: true,
    trimTrailing: true,
    collapseInner: true,
    removeBlankLines: true,
    normalizeToUnix: true,
  });
  const toast = useToast();

  const toggleOption = (key: keyof WhitespaceOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { result, spacesRemoved } = useMemo(() => {
    return removeWhitespace(text, options);
  }, [text, options]);

  return (
    <div className="space-y-4">
      <div className="card p-4 border rounded flex flex-wrap gap-4" style={{ borderColor: 'var(--color-border)' }}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={options.trimLeading} onChange={() => toggleOption('trimLeading')} />
          Trim leading
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={options.trimTrailing} onChange={() => toggleOption('trimTrailing')} />
          Trim trailing
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={options.collapseInner} onChange={() => toggleOption('collapseInner')} />
          Collapse inner
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={options.removeBlankLines} onChange={() => toggleOption('removeBlankLines')} />
          Remove blank lines
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={options.normalizeToUnix} onChange={() => toggleOption('normalizeToUnix')} />
          Normalize to Unix
        </label>
      </div>

      <div className="text-sm" style={{ color: 'var(--color-muted)' }}>
        Removed {spacesRemoved} whitespace characters
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <textarea
          className="w-full p-3 border rounded bg-transparent min-h-[400px]"
          style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
          value={text}
          onChange={(e: any) => setText(e.target.value)}
          placeholder="Enter text..."
        />
        <div className="relative">
          <textarea
            className="w-full p-3 border rounded bg-transparent min-h-[400px]"
            style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
            value={result}
            readOnly
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(result); toast.success('Copied!'); }}>Copy</Button>
            <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => downloadBlob(new Blob([result], {type: 'text/plain'}), 'no-whitespace.txt')}>Download</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
