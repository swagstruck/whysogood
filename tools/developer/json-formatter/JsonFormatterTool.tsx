'use client';
import React, { useState } from 'react';
import { Copy, Download, Trash2, Check, AlertCircle, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';

export default function JsonFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indent, setIndent] = useState<number>(2);
  const [error, setError] = useState<{ message: string; line?: number; col?: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleFormat = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, indent);
      setOutput(formatted);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        const msg = err.message;
        // Try parsing line and col from message
        const match = msg.match(/at position (\d+)/) || msg.match(/line (\d+) column (\d+)/);
        setError({
          message: msg,
          line: match && match[2] ? parseInt(match[1]) : undefined,
          col: match && match[2] ? parseInt(match[2]) : undefined,
        });
      } else {
        setError({ message: 'Invalid JSON' });
      }
    }
  };

  const handleMinify = () => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError(null);
    } catch (err: unknown) {
      setError({ message: err instanceof Error ? err.message : 'Invalid JSON' });
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await copyToClipboard(output);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/json' });
    downloadBlob(blob, 'formatted.json');
    toast.success('Downloaded formatted.json');
  };

  const loadSample = () => {
    const sample = {
      name: "whysogood",
      tagline: "One-stop client-side web utilities hub",
      features: ["Fast", "Simple", "Private", "Useful"],
      privacy: {
        clientSide: true,
        serverUploads: false,
        tracking: "none"
      },
      toolsCount: 120
    };
    setInput(JSON.stringify(sample));
    setOutput(JSON.stringify(sample, null, 2));
    setError(null);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Action Toolbar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={handleFormat}>Format</Button>
          <Button variant="secondary" onClick={handleMinify}>Minify</Button>
          <Button variant="ghost" onClick={loadSample}>Sample</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-muted)', marginLeft: 8 }}>
            <span>Indent:</span>
            <select
              value={indent}
              onChange={e => setIndent(Number(e.target.value))}
              style={{
                background: 'var(--color-surface2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: 13,
                outline: 'none',
              }}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={1}>Tab</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!output} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!output} icon={<Download size={14} />}>
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} icon={<Trash2 size={14} />}>
            Clear
          </Button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-error-subtle)', color: 'var(--color-error)',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={16} />
          <span><strong>JSON Syntax Error:</strong> {error.message}</span>
        </div>
      )}

      {/* Editor grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Input */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
            Input JSON
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            style={{
              width: '100%', height: 380, padding: 14,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13,
              resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>Formatted Output</span>
            {output && <span style={{ color: 'var(--color-accent)' }}>{output.length} chars</span>}
          </div>
          <textarea
            readOnly
            value={output}
            placeholder="Formatted output will appear here..."
            style={{
              width: '100%', height: 380, padding: 14,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13,
              resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}
