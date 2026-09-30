'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { findAndReplace } from '@/lib/text/engines';

export default function FindReplaceTool() {
  const [text, setText] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [replaceAll, setReplaceAll] = useState(true);

  const [triggerReplace, setTriggerReplace] = useState(0);
  const toast = useToast();

  const { result, matchCount, error } = useMemo(() => {
    return findAndReplace(text, find, replace, caseSensitive, wholeWord, useRegex, replaceAll);
  }, [text, find, replace, caseSensitive, wholeWord, useRegex, replaceAll, triggerReplace]);

  const handleReplaceClick = () => {
    if (result !== text) {
      setText(result);
      toast.success('Replaced!');
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        className="w-full p-3 border rounded bg-transparent min-h-[240px]"
        style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
        value={text}
        onChange={(e: any) => setText(e.target.value)}
        placeholder="Source text..."
      />

      <div className="card p-4 space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Find</span>
            {find && !error && <span className="text-sm text-green-500">{matchCount} matches</span>}
          </div>
          <input
            type="text"
            className="w-full p-2 border rounded bg-transparent"
            style={{ borderColor: 'var(--color-border)' }}
            value={find}
            onChange={e => setFind(e.target.value)}
          />
          {error && <span className="text-sm text-red-500 mt-1 block">{error}</span>}
        </div>

        <div>
          <span className="text-sm font-medium block mb-1">Replace With</span>
          <input
            type="text"
            className="w-full p-2 border rounded bg-transparent"
            style={{ borderColor: 'var(--color-border)' }}
            value={replace}
            onChange={e => setReplace(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />
            Case Sensitive
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={wholeWord} onChange={e => setWholeWord(e.target.checked)} />
            Whole Word
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
            Regex
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={replaceAll} onChange={e => setReplaceAll(e.target.checked)} />
            Replace All
          </label>
          <Button variant="primary" onClick={handleReplaceClick}>Replace in Source</Button>
        </div>
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
          <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => downloadBlob(new Blob([result], {type: 'text/plain'}), 'find-replace.txt')}>Download</Button>
        </div>
      </div>
    </div>
  );
}
