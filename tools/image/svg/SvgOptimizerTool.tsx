'use client';
import React, { useState } from 'react';
import { Minimize2, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

function optimizeSvg(svg: string, precision: number): string {
  // Round long float coordinates in paths/viewBox
  const floatRegex = /([0-9]+\.[0-9]{3,})/g;
  let optimized = svg.replace(floatRegex, match => {
    const num = parseFloat(match);
    return isNaN(num) ? match : num.toFixed(precision);
  });

  // Strip comments, extra whitespace, unnecessary empty tags
  optimized = optimized
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .replace(/<g>\s*<\/g>/gi, '')
    .trim();

  return optimized;
}

export default function SvgOptimizerTool() {
  const [inputSvg, setInputSvg] = useState('');
  const [optimizedSvg, setOptimizedSvg] = useState('');
  const [precision, setPrecision] = useState(2);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleOptimize = (text = inputSvg, prec = precision) => {
    if (!text.trim()) {
      setOptimizedSvg('');
      return;
    }
    const res = optimizeSvg(text, prec);
    setOptimizedSvg(res);
  };

  const originalSize = new TextEncoder().encode(inputSvg).length;
  const optSize = new TextEncoder().encode(optimizedSvg).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setInputSvg(content);
      handleOptimize(content, precision);
    };
    reader.readAsText(file);
  };

  const handleCopy = async () => {
    if (!optimizedSvg) return;
    await copyToClipboard(optimizedSvg);
    setCopied(true);
    toast.success('Optimized SVG copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!optimizedSvg) return;
    const blob = new Blob([optimizedSvg], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, 'optimized.svg');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => handleOptimize()}>Optimize</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-muted)' }}>
            <span>Decimal Precision:</span>
            {[1, 2, 3].map(p => (
              <button
                key={p}
                onClick={() => {
                  setPrecision(p);
                  handleOptimize(inputSvg, p);
                }}
                className="btn-secondary"
                style={{
                  height: 28, padding: '0 8px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                  borderColor: precision === p ? 'var(--color-accent)' : undefined,
                  color: precision === p ? 'var(--color-accent)' : undefined,
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <label>
            <input type="file" accept=".svg,image/svg+xml" onChange={handleFileUpload} style={{ display: 'none' }} />
            <span className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>
              Upload SVG
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!optimizedSvg} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!optimizedSvg} icon={<Download size={14} />}>
            Download
          </Button>
        </div>
      </div>

      {optimizedSvg && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
        }}>
          <span>Original: <strong>{formatFileSize(originalSize)}</strong> &rarr; Optimized: <strong>{formatFileSize(optSize)}</strong></span>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
            Reduced by {calcReductionPct(originalSize, optSize)}%
          </span>
        </div>
      )}

      {/* Editor Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)' }}>
            INPUT SVG
          </div>
          <textarea
            value={inputSvg}
            onChange={e => {
              setInputSvg(e.target.value);
              handleOptimize(e.target.value, precision);
            }}
            placeholder="Paste SVG code to optimize..."
            style={{
              width: '100%', height: 360, padding: 14,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13,
              resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>OPTIMIZED OUTPUT</span>
            {optimizedSvg && <span>{optSize} bytes</span>}
          </div>
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface2)' }}>
            {optimizedSvg ? (
              <div dangerouslySetInnerHTML={{ __html: optimizedSvg }} style={{ maxWidth: '100%', maxHeight: '100%' }} />
            ) : (
              <span style={{ color: 'var(--color-faint)', fontSize: 13 }}>Optimized preview</span>
            )}
          </div>
          <textarea
            readOnly
            value={optimizedSvg}
            placeholder="Optimized SVG code..."
            style={{
              width: '100%', height: 180, padding: 14,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 12,
              resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}
