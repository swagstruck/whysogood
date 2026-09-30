'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { cleanText, TextCleanerOptions } from '@/lib/text/engines';

export default function TextCleanerTool() {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<TextCleanerOptions>({
    removeExtraSpaces: true,
    trimLeadingTrailing: true,
    removeBlankLines: true,
    removeSpecialChars: false,
    removeNumbers: false,
    removePunctuation: false,
    removeHtmlTags: false,
    normalizeLineBreaks: true,
    removeInvisibleChars: true,
  });
  const toast = useToast();

  const toggleOption = (key: keyof TextCleanerOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { result, charsRemoved, linesRemoved } = useMemo(() => {
    return cleanText(text, options);
  }, [text, options]);

  const labels: Record<keyof TextCleanerOptions, string> = {
    removeExtraSpaces: 'Remove extra spaces',
    trimLeadingTrailing: 'Trim leading/trailing',
    removeBlankLines: 'Remove blank lines',
    removeSpecialChars: 'Remove special chars',
    removeNumbers: 'Remove numbers',
    removePunctuation: 'Remove punctuation',
    removeHtmlTags: 'Remove HTML tags',
    normalizeLineBreaks: 'Normalize line breaks',
    removeInvisibleChars: 'Remove invisible chars',
  };

  return (
    <div className="space-y-4">
      <textarea
        className="w-full p-3 border rounded bg-transparent min-h-[200px]"
        style={{ borderColor: 'var(--color-border)' }}
        value={text}
        onChange={(e: any) => setText(e.target.value)}
        placeholder="Enter text to clean..."
      />

      <div className="card p-4 border rounded" style={{ borderColor: 'var(--color-border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(Object.keys(options) as (keyof TextCleanerOptions)[]).map(key => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={options[key]} onChange={() => toggleOption(key)} />
              {labels[key]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm" style={{ color: 'var(--color-muted)' }}>
        <span>Removed {charsRemoved} characters · {linesRemoved} lines cleaned</span>
      </div>

      <div className="relative">
        <textarea
          className="w-full p-3 border rounded bg-transparent min-h-[200px]"
          style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
          value={result}
          readOnly
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(result); toast.success('Copied!'); }}>Copy</Button>
          <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => downloadBlob(new Blob([result], {type: 'text/plain'}), 'cleaned.txt')}>Download</Button>
        </div>
      </div>
    </div>
  );
}
