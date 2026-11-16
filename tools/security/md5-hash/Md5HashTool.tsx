'use client';

import React, { useState, useEffect, useId } from 'react';
import { Copy, Check, Upload, Trash2, FileCheck, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { md5 } from '@/lib/security/engines';
import { copyToClipboard, formatFileSize } from '@/lib/utils';

export default function Md5HashTool() {
  const fileInputId = useId();
  const [input, setInput] = useState<string>('');
  const [hash, setHash] = useState<string>('');
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [expectedHash, setExpectedHash] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const toast = useToast();

  const computeHash = (text: string, isUpper: boolean = uppercase) => {
    if (!text && !fileName) {
      setHash('');
      return;
    }
    let h = md5(text);
    if (isUpper) h = h.toUpperCase();
    setHash(h);
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    setFileName(null);
    setFileSize(null);
    computeHash(val, uppercase);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setInput('');

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const uint8 = new Uint8Array(buffer);
      let h = md5(uint8);
      if (uppercase) h = h.toUpperCase();
      setHash(h);
      toast.success(`Calculated checksum for ${file.name}`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleCase = () => {
    const nextCase = !uppercase;
    setUppercase(nextCase);
    if (hash) {
      setHash(nextCase ? hash.toUpperCase() : hash.toLowerCase());
    }
  };

  const handleClear = () => {
    setInput('');
    setHash('');
    setExpectedHash('');
    setFileName(null);
    setFileSize(null);
  };

  const loadSample = () => {
    const sample = 'The quick brown fox jumps over the lazy dog';
    setInput(sample);
    setFileName(null);
    setFileSize(null);
    computeHash(sample, uppercase);
    toast.success('Sample text loaded');
  };

  const handleCopy = () => {
    if (!hash) return;
    copyToClipboard(hash);
    setCopied(true);
    toast.success('MD5 hash copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isMatching = expectedHash.trim()
    ? hash.toLowerCase() === expectedHash.trim().toLowerCase()
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Controls Card */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              MD5 Hash Generator & Checksum Verifier
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Compute 128-bit MD5 checksums for strings, text payloads, or local files with instant comparison.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={loadSample}>
              <Sparkles size={16} /> Sample
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={!input && !hash && !expectedHash && !fileName}>
              <Trash2 size={16} /> Clear
            </Button>
          </div>
        </div>

        {/* Input Area */}
        <div className="c-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="c-field__label" style={{ marginBottom: 0 }}>Input Text or Payload</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                id={fileInputId}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <label
                htmlFor={fileInputId}
                className="c-btn c-btn--secondary c-btn--sm"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} /> Upload File for Checksum
              </label>
            </div>
          </div>

          {fileName ? (
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-3)',
                border: '1px dashed var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileCheck size={24} style={{ color: 'var(--brand)' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 'var(--text-body)' }}>{fileName}</div>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>
                    {fileSize ? formatFileSize(fileSize) : 'File ready'}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Remove
              </Button>
            </div>
          ) : (
            <textarea
              className="c-textarea"
              rows={4}
              placeholder="Enter text to hash..."
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: 'var(--text-caption)', color: 'var(--ink-3)' }}>
            <span>{input ? `${input.length} characters • ${new TextEncoder().encode(input).length} bytes` : 'Waiting for input'}</span>
            <span>Algorithm: RFC 1321 (MD5)</span>
          </div>
        </div>

        {/* Options & Output Hash */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <label className="c-field__label" style={{ marginBottom: 0 }}>Computed MD5 Hash Digest</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className={`c-btn ${uppercase ? 'c-btn--primary' : 'c-btn--secondary'} c-btn--sm`}
                onClick={toggleCase}
                style={{ padding: '4px 10px', fontSize: 'var(--text-caption)' }}
              >
                {uppercase ? 'UPPERCASE' : 'lowercase'}
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              minHeight: '56px'
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-body)',
                color: hash ? 'var(--ink)' : 'var(--ink-3)',
                wordBreak: 'break-all',
                userSelect: 'all'
              }}
            >
              {hash || 'e.g. b10a8db164e0754105b7a99be72e3fe5'}
            </div>
            {hash && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                title="Copy hash"
              >
                {copied ? <Check size={16} style={{ color: 'var(--pos)' }} /> : <Copy size={16} />}
              </Button>
            )}
          </div>
        </div>

        {/* Expected Checksum Verification Box */}
        <div className="c-field" style={{ marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="c-field__label" style={{ marginBottom: 0 }}>Compare with Expected Hash (Integrity Check)</label>
            {isMatching !== null && (
              isMatching ? (
                <span className="c-badge c-badge--pos">
                  <span className="c-badge-dot" /> Match Verified
                </span>
              ) : (
                <span className="c-badge c-badge--neg">
                  <span className="c-badge-dot" /> Checksum Mismatch
                </span>
              )
            )}
          </div>
          <input
            className="c-field__input"
            type="text"
            placeholder="Paste expected MD5 hash to verify integrity..."
            value={expectedHash}
            onChange={(e) => setExpectedHash(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* Primary Action Button (Rule 2: strictly max 1 primary button per view) */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            type="button"
            className="c-btn c-btn--primary"
            onClick={handleCopy}
            disabled={!hash}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            Copy MD5 Checksum
          </button>
        </div>
      </div>

      {/* Advisory Callout */}
      <div className="c-alert c-alert--warn">
        <ShieldAlert size={20} />
        <div>
          <strong>Integrity & Security Notice:</strong> MD5 produces a 128-bit hash and remains widely used for quick file integrity checks and non-cryptographic checksum verification. However, due to known collision vulnerabilities, it should not be used for secure password storage or digital signatures. Use <strong>SHA-256</strong> or <strong>SHA-512</strong> for cryptographic security.
        </div>
      </div>
    </div>
  );
}
