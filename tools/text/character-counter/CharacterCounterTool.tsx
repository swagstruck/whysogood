'use client';
import React, { useState } from 'react';
import { Copy, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, formatFileSize } from '@/lib/utils';

export default function CharacterCounterTool() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const totalChars = text.length;
  const noSpaces = text.replace(/\s/g, '').length;
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const numbers = (text.match(/[0-9]/g) || []).length;
  const spaces = (text.match(/\s/g) || []).length;
  const lines = text ? text.split('\n').length : 0;
  const byteSize = new TextEncoder().encode(text).length;

  const handleCopy = async () => {
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Characters', val: totalChars, color: 'var(--color-accent)' },
          { label: 'Without Spaces', val: noSpaces, color: 'var(--color-text)' },
          { label: 'Letters', val: letters, color: 'var(--color-text)' },
          { label: 'Numbers', val: numbers, color: 'var(--color-text)' },
          { label: 'Whitespace', val: spaces, color: 'var(--color-text)' },
          { label: 'Lines', val: lines, color: 'var(--color-text)' },
          { label: 'Byte Size', val: formatFileSize(byteSize), color: 'var(--color-success)' },
        ].map((item, idx) => (
          <div key={idx} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: item.color, letterSpacing: '-0.02em' }}>
              {item.val}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4, fontWeight: 500 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!text} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setText('')} disabled={!text} icon={<Trash2 size={14} />}>
            Clear
          </Button>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type or paste characters to calculate detailed counts..."
          style={{
            width: '100%', minHeight: 320, padding: 18,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14,
            resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
          }}
          autoFocus
        />
      </div>
    </div>
  );
}
