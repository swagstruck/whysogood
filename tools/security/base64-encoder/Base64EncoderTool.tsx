'use client';
import React, { useState } from 'react';
import { Copy, Download, Trash2, Check, ArrowDownUp, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';

export default function Base64EncoderTool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [urlSafe, setUrlSafe] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const toast = useToast();

  const handleProcess = (val = input, isUrlSafe = urlSafe, curMode = mode) => {
    if (!val) {
      setOutput('');
      setError(null);
      return;
    }
    setError(null);

    try {
      if (curMode === 'encode') {
        // UTF-8 safe encode
        const bytes = new TextEncoder().encode(val);
        let binary = '';
        for (let j = 0; j < bytes.byteLength; j++) {
          binary += String.fromCharCode(bytes[j]);
        }
        let b64 = btoa(binary);
        if (isUrlSafe) {
          b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        setOutput(b64);
      } else {
        // Decode
        let norm = val.trim();
        if (isUrlSafe) {
          norm = norm.replace(/-/g, '+').replace(/_/g, '/');
          while (norm.length % 4) norm += '=';
        }
        const binary = atob(norm);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) {
          bytes[j] = binary.charCodeAt(j);
        }
        const decoded = new TextDecoder().decode(bytes);
        setOutput(decoded);
      }
    } catch {
      setError(curMode === 'decode' ? 'Invalid Base64 string.' : 'Encoding error.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt.target?.result as string;
      // Strip data url prefix if desired, or show full data url
      setOutput(dataUrl);
      setInput(`[File: ${file.name} (${file.type})]`);
      toast.success('File encoded to Base64 Data URL');
    };
    reader.readAsDataURL(file);
  };

  const swapMode = () => {
    const nextMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(nextMode);
    setInput(output);
    handleProcess(output, urlSafe, nextMode);
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
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, mode === 'encode' ? 'encoded_base64.txt' : 'decoded_text.txt');
    toast.success('Downloaded output file');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Control Bar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: 2, border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => {
                setMode('encode');
                handleProcess(input, urlSafe, 'encode');
              }}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: mode === 'encode' ? 'var(--color-accent)' : 'transparent',
                color: mode === 'encode' ? '#fff' : 'var(--color-muted)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Encode
            </button>
            <button
              onClick={() => {
                setMode('decode');
                handleProcess(input, urlSafe, 'decode');
              }}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: mode === 'decode' ? 'var(--color-accent)' : 'transparent',
                color: mode === 'decode' ? '#fff' : 'var(--color-muted)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Decode
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={swapMode} icon={<ArrowDownUp size={14} />}>
            Swap
          </Button>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={e => {
                setUrlSafe(e.target.checked);
                handleProcess(input, e.target.checked, mode);
              }}
            />
            URL-safe Base64 (- and _)
          </label>

          <label>
            <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
            <span className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>
              Encode File
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!output} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!output} icon={<Download size={14} />}>
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setInput(''); setOutput(''); setError(null); }} disabled={!input && !output}>
            Clear
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-error-subtle)', color: 'var(--color-error)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Inputs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Input Textarea */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
            {mode === 'encode' ? 'Plaintext to Encode' : 'Base64 to Decode'}
          </div>
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value);
              handleProcess(e.target.value, urlSafe, mode);
            }}
            placeholder={mode === 'encode' ? 'Type or paste text to encode...' : 'Paste Base64 string to decode...'}
            style={{
              width: '100%', height: 360, padding: 14,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13,
              resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Output Textarea */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>{mode === 'encode' ? 'Base64 Result' : 'Decoded Plaintext'}</span>
            {output && <span style={{ color: 'var(--color-accent)' }}>{output.length} characters</span>}
          </div>
          <textarea
            readOnly
            value={output}
            placeholder="Result will appear here..."
            style={{
              width: '100%', height: 360, padding: 14,
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
