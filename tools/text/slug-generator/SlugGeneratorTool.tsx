'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { generateSlug, SlugSeparator } from '@/lib/text/engines';

export default function SlugGeneratorTool() {
  const [text, setText] = useState('');
  const [separator, setSeparator] = useState<SlugSeparator>('-');
  const [lowercase, setLowercase] = useState(true);
  const [removeStopWords, setRemoveStopWords] = useState(false);
  const [maxLength, setMaxLength] = useState<number>(0);
  const toast = useToast();

  const slug = useMemo(() => {
    return generateSlug(text, { separator, lowercase, removeStopWords, maxLength });
  }, [text, separator, lowercase, removeStopWords, maxLength]);

  const loadSample = () => {
    setText('10 Best Ways to Implement React Hooks (2024 Guide)');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Source Title or Phrase</label>
        <input
          type="text"
          className="w-full p-4 border rounded bg-transparent text-lg"
          style={{ borderColor: 'var(--color-border)' }}
          value={text}
          onChange={(e: any) => setText(e.target.value)}
          placeholder="Enter text..."
        />
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <Select
          value={separator}
          onChange={(e: any) => setSeparator(e.target.value as SlugSeparator)}
          options={[{label: 'Hyphen (-)', value: '-'}, {label: 'Underscore (_)', value: '_'}, {label: 'Dot (.)', value: '.'}]}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={lowercase} onChange={e => setLowercase(e.target.checked)} />
          Lowercase
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={removeStopWords} onChange={e => setRemoveStopWords(e.target.checked)} />
          Remove Stop Words
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span>Max Length:</span>
          <input 
            type="number" 
            className="w-20 p-1 border rounded bg-transparent"
            style={{ borderColor: 'var(--color-border)' }}
            value={maxLength || ''} 
            onChange={e => setMaxLength(Number(e.target.value) || 0)} 
            placeholder="0"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={loadSample}>Sample phrase</Button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Generated Slug</label>
        <div className="relative">
          <input
            type="text"
            className="w-full p-4 pr-24 border rounded bg-transparent text-lg"
            style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-accent)' }}
            value={slug}
            readOnly
          />
          <div className="absolute top-1/2 right-2 -translate-y-1/2">
            <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(slug); toast.success('Copied!'); }}>Copy</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
