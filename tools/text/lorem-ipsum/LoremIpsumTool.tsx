'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Copy, Download, RefreshCw } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { generateLorem, LoremUnit } from '@/lib/text/engines';

export default function LoremIpsumTool() {
  const [count, setCount] = useState<number>(3);
  const [unit, setUnit] = useState<LoremUnit>('paragraphs');
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [result, setResult] = useState('');
  const toast = useToast();

  const handleGenerate = () => {
    setResult(generateLorem(count, unit, startWithLorem));
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const words = result.trim() ? result.trim().split(/\s+/).length : 0;
  const chars = result.length;

  return (
    <div className="space-y-4">
      <div className="card p-4 border rounded flex flex-wrap gap-4 items-center" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            min="1" max="100"
            className="w-20 p-2 border rounded bg-transparent"
            style={{ borderColor: 'var(--color-border)' }}
            value={count} 
            onChange={e => setCount(Number(e.target.value) || 1)} 
          />
          <Select
            value={unit}
            onChange={(e: any) => setUnit(e.target.value as LoremUnit)}
            options={[
              {label: 'Words', value: 'words'}, 
              {label: 'Sentences', value: 'sentences'}, 
              {label: 'Paragraphs', value: 'paragraphs'}
            ]}
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={startWithLorem} onChange={e => setStartWithLorem(e.target.checked)} />
          Start with "Lorem ipsum..."
        </label>
        
        <div className="ml-auto flex gap-2">
          <Button variant="primary" onClick={handleGenerate}>Generate</Button>
          <Button variant="secondary" icon={<RefreshCw size={14}/>} onClick={handleGenerate}>Regenerate</Button>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm" style={{ color: 'var(--color-muted)' }}>
        <span>{words} words · {chars} characters</span>
      </div>

      <div className="relative">
        <textarea
          className="w-full p-4 border rounded bg-transparent min-h-[400px]"
          style={{ borderColor: 'var(--color-border)' }}
          value={result}
          readOnly
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(result); toast.success('Copied!'); }}>Copy</Button>
          <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => downloadBlob(new Blob([result], {type: 'text/plain'}), 'lorem-ipsum.txt')}>Download</Button>
        </div>
      </div>
    </div>
  );
}
