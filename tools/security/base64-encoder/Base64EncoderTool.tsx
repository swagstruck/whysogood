'use client';

import React, { useState, useId } from 'react';
import { Copy, Download, Trash2, Check, Upload, Binary, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob, formatFileSize } from '@/lib/utils';

export default function Base64EncoderTool() {
  const fileInputId = useId();
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [urlSafe, setUrlSafe] = useState<boolean>(false);
  const [formatDataUri, setFormatDataUri] = useState<boolean>(false);
  const [mimeType, setMimeType] = useState<string>('text/plain');
  const [splitLines, setSplitLines] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const toast = useToast();

  const encodeText = (
    val: string,
    isUrlSafe: boolean = urlSafe,
    isDataUri: boolean = formatDataUri,
    mime: string = mimeType,
    wrap76: boolean = splitLines
  ) => {
    if (!val) {
      setOutput('');
      return;
    }

    try {
      // UTF-8 safe text encoding
      const bytes = new TextEncoder().encode(val);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      let b64 = btoa(binary);

      if (isUrlSafe) {
        b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      if (wrap76 && !isDataUri) {
        b64 = b64.match(/.{1,76}/g)?.join('\n') || b64;
      }

      if (isDataUri) {
        setOutput(`data:${mime};base64,${b64}`);
      } else {
        setOutput(b64);
      }
    } catch (e) {
      toast.error('Failed to encode text');
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    setFileName(null);
    setFileSize(null);
    encodeText(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    const mime = file.type || 'application/octet-stream';
    setMimeType(mime);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64Only = result.split(',')[1] || '';

      let formatted = b64Only;
      if (urlSafe) {
        formatted = formatted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      if (formatDataUri) {
        setOutput(`data:${mime};base64,${formatted}`);
      } else {
        if (splitLines) {
          formatted = formatted.match(/.{1,76}/g)?.join('\n') || formatted;
        }
        setOutput(formatted);
      }

      setInput(`[File: ${file.name} (${formatFileSize(file.size)}) - ${mime}]`);
      toast.success(`Encoded ${file.name}`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = async () => {
    if (!output) return;
    await copyToClipboard(output);
    setCopied(true);
    toast.success('Base64 string copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, fileName ? `${fileName}.b64.txt` : 'encoded-base64.txt');
    toast.success('Downloaded Base64 file');
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setFileName(null);
    setFileSize(null);
  };

  const handleLoadSample = () => {
    const sample = 'Hello, World! 🚀 Secure, client-side Base64 encoding by whysogood.space';
    setInput(sample);
    encodeText(sample);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={(e) => {
                setUrlSafe(e.target.checked);
                encodeText(input, e.target.checked, formatDataUri, mimeType, splitLines);
              }}
            />
            <span>URL-Safe (RFC 4648)</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={formatDataUri}
              onChange={(e) => {
                setFormatDataUri(e.target.checked);
                encodeText(input, urlSafe, e.target.checked, mimeType, splitLines);
              }}
            />
            <span>Data URI scheme (data:mime;base64,...)</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={splitLines}
              disabled={formatDataUri}
              onChange={(e) => {
                setSplitLines(e.target.checked);
                encodeText(input, urlSafe, formatDataUri, mimeType, e.target.checked);
              }}
            />
            <span>Wrap lines (76 chars)</span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor={fileInputId} style={{ margin: 0 }}>
            <span
              className="c-btn c-btn--secondary c-btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Upload size={14} />
              <span>Encode Any File</span>
            </span>
            <input
              id={fileInputId}
              type="file"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <Button variant="ghost" size="sm" onClick={handleLoadSample}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Sample
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!input && !output}>
            <Trash2 size={14} style={{ marginRight: 6 }} />
            Clear
          </Button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Input Card */}
        <div className="c-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <label className="c-field__label" style={{ margin: 0, fontWeight: 700 }}>
              Plaintext or File Content
            </label>
            {fileName ? (
              <span className="c-badge c-badge--brand">
                {fileName} ({formatFileSize(fileSize || 0)})
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {input.length} characters
              </span>
            )}
          </div>

          <textarea
            className="c-textarea"
            rows={14}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type or paste text to encode, or upload any file..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Output Card */}
        <div className="c-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <label className="c-field__label" style={{ margin: 0, fontWeight: 700 }}>
              Base64 Encoded Output
            </label>
            {output && (
              <span className="c-badge c-badge--neutral">
                {output.length} characters
              </span>
            )}
          </div>

          <textarea
            readOnly
            className="c-textarea"
            rows={14}
            value={output}
            placeholder="Base64 encoded string will appear here automatically..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              background: 'var(--bg-3)',
              color: 'var(--brand)',
              resize: 'vertical',
            }}
          />

          {/* Action Buttons: Max 1 Primary Button per View per Guidelines */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 16,
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={!output}
            >
              <Download size={14} style={{ marginRight: 6 }} />
              Download .txt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              disabled={!output}
            >
              {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
              {copied ? 'Copied' : 'Copy Base64'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
