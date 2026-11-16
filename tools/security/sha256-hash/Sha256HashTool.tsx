'use client';

import React, { useState, useEffect, useId } from 'react';
import { Copy, Check, Upload, Trash2, FileCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { sha256 } from '@/lib/security/engines';
import { copyToClipboard, formatFileSize } from '@/lib/utils';

export default function Sha256HashTool() {
  const fileInputId = useId();
  const [input, setInput] = useState<string>('');
  const [hash, setHash] = useState<string>('');
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [expectedHash, setExpectedHash] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const toast = useToast();

  const computeHash = async (text: string, isUpper: boolean = uppercase) => {
    if (!text && !fileName) {
      setHash('');
      return;
    }
    try {
      let h = await sha256(text);
      if (isUpper) h = h.toUpperCase();
      setHash(h);
    } catch (e) {
      toast.error('Failed to compute SHA-256 hash');
    }
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
    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        let h = await sha256(buffer);
        if (uppercase) h = h.toUpperCase();
        setHash(h);
        toast.success(`Calculated SHA-256 for ${file.name}`);
      } catch (e) {
        toast.error('Failed to hash file');
      }
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
    toast.success('SHA-256 hash copied to clipboard');
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
              SHA-256 Hash Generator & Verifier
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Cryptographically secure 256-bit SHA-2 hash computation powered natively by the Web Crypto API.
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
              placeholder="Enter text to compute SHA-256 hash..."
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: 'var(--text-caption)', color: 'var(--ink-3)' }}>
            <span>{input ? `${input.length} characters • ${new TextEncoder().encode(input).length} bytes` : 'Waiting for input'}</span>
            <span>Standard: NIST FIPS 180-4 (SHA-256)</span>
          </div>
        </div>

        {/* Options & Output Hash */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <label className="c-field__label" style={{ marginBottom: 0 }}>Computed SHA-256 Digest (64 hex characters)</label>
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
                fontSize: 'var(--text-body-sm)',
                color: hash ? 'var(--ink)' : 'var(--ink-3)',
                wordBreak: 'break-all',
                userSelect: 'all'
              }}
            >
              {hash || 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'}
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
                  <span className="c-badge-dot" /> Hash Mismatch
                </span>
              )
            )}
          </div>
          <input
            className="c-field__input"
            type="text"
            placeholder="Paste expected SHA-256 hash to compare..."
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
            Copy SHA-256 Hash
          </button>
        </div>
      </div>

      {/* Security & Cryptographic Standard Callout */}
      <div className="c-alert c-alert--pos">
        <ShieldCheck size={20} />
        <div>
          <strong>Industry Standard Security:</strong> SHA-256 is an unbroken cryptographic hash function designed by the NSA and standardized by NIST. It is the cryptographic backbone for TLS/SSL certificates, Bitcoin, Git commit signatures, and digital signatures worldwide.
        </div>
      </div>
    </div>
  );
}
