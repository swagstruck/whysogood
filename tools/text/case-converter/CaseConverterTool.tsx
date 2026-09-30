'use client';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy, Download } from 'lucide-react';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import {
  toUpperCase, toLowerCase, toTitleCase, toSentenceCase, toCamelCase,
  toPascalCase, toSnakeCase, toKebabCase, toAlternatingCase, toInverseCase
} from '@/lib/text/engines';

export default function CaseConverterTool() {
  const [text, setText] = useState('');
  const [activeCase, setActiveCase] = useState<string>('Title Case');
  const toast = useToast();

  const outputText = useMemo(() => {
    switch (activeCase) {
      case 'UPPERCASE': return toUpperCase(text);
      case 'lowercase': return toLowerCase(text);
      case 'Title Case': return toTitleCase(text);
      case 'Sentence case': return toSentenceCase(text);
      case 'camelCase': return toCamelCase(text);
      case 'PascalCase': return toPascalCase(text);
      case 'snake_case': return toSnakeCase(text);
      case 'kebab-case': return toKebabCase(text);
      case 'aLtErNaTiNg': return toAlternatingCase(text);
      case 'iNVERSE cAsE': return toInverseCase(text);
      default: return text;
    }
  }, [text, activeCase]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-sm" style={{ color: 'var(--color-muted)' }}>
        <span>{words} words · {chars} characters</span>
        <Button variant="ghost" size="sm" onClick={() => setText('Here is a Sample sentence. Make it different!')}>Load Sample</Button>
      </div>
      <textarea
        className="w-full p-3 border rounded bg-transparent min-h-[280px]"
        value={text}
        onChange={(e: any) => setText(e.target.value)}
        placeholder="Enter text to convert..."
        style={{ borderColor: 'var(--color-border)' }}
      />
      
      <div className="flex flex-wrap gap-2">
        {['UPPERCASE', 'lowercase', 'Title Case', 'Sentence case', 'camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'aLtErNaTiNg', 'iNVERSE cAsE'].map(c => (
          <Button 
            key={c} 
            variant={activeCase === c ? 'primary' : 'secondary'} 
            onClick={() => setActiveCase(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="relative mt-6">
        <textarea
          className="w-full p-3 border rounded bg-transparent min-h-[180px]"
          style={{ fontFamily: 'var(--font-mono)', borderColor: 'var(--color-border)' }}
          value={outputText}
          readOnly
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={() => { copyToClipboard(outputText); toast.success('Copied!'); }}>Copy</Button>
          <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={() => { downloadBlob(new Blob([outputText], {type: 'text/plain'}), 'converted.txt'); }}>Download</Button>
        </div>
      </div>
    </div>
  );
}
