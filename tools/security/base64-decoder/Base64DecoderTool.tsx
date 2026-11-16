'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Download, Trash2, Check, Sparkles, FileText, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob, formatFileSize } from '@/lib/utils';
import { base64Decode, base64DecodeToBytes } from '@/lib/security/engines';

export default function Base64DecoderTool() {
  const [input, setInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const toast = useToast();

  // Clean and decode the Base64 input
  const decodeResult = useMemo(() => {
    const raw = input.trim();
    if (!raw) return null;

    // Strip Data URI header if present (e.g. data:image/png;base64,...)
    let cleaned = raw;
    let dataUriMime: string | null = null;
    const dataUriMatch = raw.match(/^data:([^;]+);base64,([\s\S]*)$/);
    if (dataUriMatch) {
      dataUriMime = dataUriMatch[1];
      cleaned = dataUriMatch[2].trim();
    }

    // Handle URL-safe variant (- and _)
    let standardB64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    while (standardB64.length % 4 !== 0) {
      standardB64 += '=';
    }

    try {
      // Decode bytes
      const binaryString = atob(standardB64);
      const byteLen = binaryString.length;
      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check if image data
      let isImage = false;
      let imgSrc: string | null = null;
      if (dataUriMime && dataUriMime.startsWith('image/')) {
        isImage = true;
        imgSrc = `data:${dataUriMime};base64,${standardB64}`;
      } else if (
        (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) || // PNG
        (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) || // JPEG
        (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) // GIF
      ) {
        isImage = true;
        const detectedType = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : 'image/gif';
        imgSrc = `data:${detectedType};base64,${standardB64}`;
      }

      // Try UTF-8 text decode
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        text = binaryString; // fallback to latin1 string
      }

      return {
        success: true,
        text,
        bytes,
        byteLength: byteLen,
        isImage,
        imgSrc,
        error: null,
      };
    } catch {
      return {
        success: false,
        text: '',
        bytes: null,
        byteLength: 0,
        isImage: false,
        imgSrc: null,
        error: 'Invalid Base64 string. Please ensure valid Base64 characters and correct padding.',
      };
    }
  }, [input]);

  const handleCopy = async () => {
    if (!decodeResult || !decodeResult.success) return;
    await copyToClipboard(decodeResult.text);
    setCopied(true);
    toast.success('Decoded text copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = () => {
    if (!decodeResult || !decodeResult.success) return;
    const blob = new Blob([decodeResult.text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'decoded-text.txt');
    toast.success('Downloaded text file');
  };

  const handleDownloadBinary = () => {
    if (!decodeResult || !decodeResult.bytes) return;
    const ext = decodeResult.isImage ? 'png' : 'bin';
    const blob = new Blob([decodeResult.bytes as any], { type: 'application/octet-stream' });
    downloadBlob(blob, `decoded-binary.${ext}`);
    toast.success(`Downloaded binary file (.${ext})`);
  };

  const handleLoadSample = () => {
    const sample = 'SGVsbG8sIFdvcmxkISDwn5qAIFNlY3VyZSwgY2xpZW50LXNpZGUgQmFzZTY0IGRlY29kaW5nIGJ5IHdoeXNvZ29vZC5zcGFjZQ==';
    setInput(sample);
  };

  const handleClear = () => {
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Decodes standard RFC 4648 Base64, URL-Safe Base64, and Data URI schemes into text or binary.
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={handleLoadSample}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Sample Base64
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!input}>
            <Trash2 size={14} style={{ marginRight: 6 }} />
            Clear
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {decodeResult && !decodeResult.success && decodeResult.error && (
        <div className="c-alert c-alert--neg" style={{ fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div>{decodeResult.error}</div>
        </div>
      )}

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
              Base64 Input String
            </label>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {input.length} characters
            </span>
          </div>

          <textarea
            className="c-textarea"
            rows={14}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste Base64 or Data URI string here (e.g. SGVsbG8gV29ybGQ=)..."
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
              Decoded Output
            </label>
            {decodeResult?.success && (
              <span className="c-badge c-badge--pos">
                {formatFileSize(decodeResult.byteLength)}
              </span>
            )}
          </div>

          {/* If image preview is available */}
          {decodeResult?.isImage && decodeResult.imgSrc && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                background: 'var(--bg-3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={decodeResult.imgSrc}
                alt="Decoded Preview"
                style={{
                  maxWidth: 96,
                  maxHeight: 72,
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              />
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                <strong>Embedded Image Detected:</strong> Preview rendered above.
              </div>
            </div>
          )}

          <textarea
            readOnly
            className="c-textarea"
            rows={14}
            value={decodeResult?.success ? decodeResult.text : ''}
            placeholder="Decoded text content will appear here..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              background: 'var(--bg-3)',
              color: 'var(--ink)',
              resize: 'vertical',
            }}
          />

          {/* Action Buttons: Exactly 1 Primary button per view */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 16,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadBinary}
              disabled={!decodeResult?.success}
            >
              <Download size={14} style={{ marginRight: 6 }} />
              Download Binary (.bin)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadText}
              disabled={!decodeResult?.success}
            >
              <Download size={14} style={{ marginRight: 6 }} />
              Download .txt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              disabled={!decodeResult?.success}
            >
              {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
