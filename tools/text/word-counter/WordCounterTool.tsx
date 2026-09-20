'use client';
import React, { useState } from 'react';
import { Copy, Trash2, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';

export default function WordCounterTool() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  // Metrics
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(w => w.length > 0).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s+/g, '').length;
  const sentences = trimmed ? trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
  const paragraphs = trimmed ? text.split(/\n+/).filter(p => p.trim().length > 0).length : 0;
  const readingTimeMin = Math.ceil(words / 200);
  const speakingTimeMin = Math.ceil(words / 130);

  const handleCopy = async () => {
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setText('');
  };

  const loadSample = () => {
    const sample = `The quick brown fox jumps over the lazy dog. Online client-side tools provide unmatched speed, simplicity, and privacy.\n\nBecause no data is transmitted to a remote server, users maintain complete ownership of their documents, text, and files. Everything happens right inside the browser engine using modern web capabilities.`;
    setText(sample);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Words', value: words, color: 'var(--color-accent)' },
          { label: 'Characters', value: characters, color: 'var(--color-text)' },
          { label: 'Without Spaces', value: charactersNoSpaces, color: 'var(--color-text)' },
          { label: 'Sentences', value: sentences, color: 'var(--color-text)' },
          { label: 'Paragraphs', value: paragraphs, color: 'var(--color-text)' },
          { label: 'Reading Time', value: `~${readingTimeMin} min`, color: 'var(--color-success)' },
        ].map((m, idx) => (
          <div key={idx} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.color, letterSpacing: '-0.02em' }}>
              {m.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4, fontWeight: 500 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Editor & Actions */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)' }}>
            Speaking time: ~{speakingTimeMin} min &bull; Avg word length: {words > 0 ? (charactersNoSpaces / words).toFixed(1) : 0} chars
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={loadSample}>
              Sample Text
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!text} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={!text} icon={<Trash2 size={14} />}>
              Clear
            </Button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste or type text here to instantly count words and characters..."
          style={{
            width: '100%', minHeight: 320, padding: 18,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 15,
            resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
          }}
          autoFocus
        />
      </div>
    </div>
  );
}
