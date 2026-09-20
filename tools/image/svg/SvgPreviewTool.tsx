'use client';
import React, { useState, useRef } from 'react';
import { Eye, ZoomIn, ZoomOut, RotateCcw, Copy, Check, Download, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function SvgPreviewTool() {
  const [svgText, setSvgText] = useState('');
  const [zoom, setZoom] = useState(100);
  const [bgMode, setBgMode] = useState<'checkered' | 'dark' | 'light'>('checkered');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setSvgText(evt.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleCopy = async () => {
    if (!svgText) return;
    await copyToClipboard(svgText);
    setCopied(true);
    toast.success('SVG code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!svgText) return;
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, 'previewed.svg');
  };

  const loadSample = () => {
    setSvgText(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
  </defs>
  <rect x="20" y="20" width="160" height="160" rx="30" fill="url(#grad)" />
  <polygon points="100,50 140,140 60,140" fill="#ffffff" />
</svg>`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Controls */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <input ref={inputRef} type="file" accept=".svg,image/svg+xml" onChange={handleFileUpload} style={{ display: 'none' }} />
            <span className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>
              Upload SVG
            </span>
          </label>
          <Button variant="ghost" size="sm" onClick={loadSample}>Sample SVG</Button>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            <button
              onClick={() => setZoom(z => Math.max(25, z - 25))}
              className="btn-secondary"
              style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: 12, minWidth: 44, textAlign: 'center', fontWeight: 600 }}>{zoom}%</span>
            <button
              onClick={() => setZoom(z => Math.min(800, z + 25))}
              className="btn-secondary"
              style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="btn-secondary"
              title="Reset Zoom"
              style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Background toggles */}
          <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
            {(['checkered', 'dark', 'light'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBgMode(b)}
                style={{
                  padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: bgMode === b ? 'var(--color-accent)' : 'transparent',
                  color: bgMode === b ? '#fff' : 'var(--color-muted)',
                  fontSize: 11, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!svgText} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!svgText} icon={<Download size={14} />}>
            Download
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Visual Viewport */}
        <div
          className="card"
          style={{
            minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'auto', padding: 24,
            background: bgMode === 'dark' ? '#0f172a' : bgMode === 'light' ? '#f8fafc' : 'repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%) 50% / 16px 16px',
          }}
        >
          {svgText ? (
            <div
              dangerouslySetInnerHTML={{ __html: svgText }}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
              }}
            />
          ) : (
            <div style={{ color: 'var(--color-faint)', textAlign: 'center' }}>
              <Eye size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Upload or paste SVG code to preview</p>
            </div>
          )}
        </div>

        {/* Source Code */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>SVG SOURCE CODE</span>
            {svgText && <span>{formatFileSize(new TextEncoder().encode(svgText).length)}</span>}
          </div>
          <textarea
            value={svgText}
            onChange={e => setSvgText(e.target.value)}
            placeholder="Paste SVG code here..."
            style={{
              width: '100%', height: 400, padding: 14,
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
