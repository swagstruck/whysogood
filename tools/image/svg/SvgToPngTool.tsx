'use client';
import React, { useState, useRef } from 'react';
import { ArrowRight, Download, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function SvgToPngTool() {
  const [file, setFile] = useState<File | null>(null);
  const [svgText, setSvgText] = useState('');
  const [scale, setScale] = useState(2);
  const [customW, setCustomW] = useState(1024);
  const [customH, setCustomH] = useState(1024);
  const [mode, setMode] = useState<'scale' | 'custom'>('scale');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);
  const [pngPreview, setPngPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileUpload = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setSvgText(text);
      renderPng(text, scale, customW, customH, mode);
    };
    reader.readAsText(f);
  };

  const renderPng = async (svgStr: string, sc: number, w: number, h: number, m: 'scale' | 'custom') => {
    if (!svgStr.trim()) return;
    setIsProcessing(true);

    try {
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });

      let targetW = (img.naturalWidth || 500) * sc;
      let targetH = (img.naturalHeight || 500) * sc;
      if (m === 'custom') {
        targetW = w;
        targetH = h;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);
      URL.revokeObjectURL(url);

      canvas.toBlob(outBlob => {
        if (outBlob) {
          setPngBlob(outBlob);
          if (pngPreview) URL.revokeObjectURL(pngPreview);
          setPngPreview(URL.createObjectURL(outBlob));
          toast.success(`Rasterized to ${targetW} × ${targetH} PNG`);
        }
        setIsProcessing(false);
      }, 'image/png');
    } catch {
      setIsProcessing(false);
      toast.error('Failed to render SVG');
    }
  };

  const handleDownload = () => {
    if (!pngBlob) return;
    const base = file ? file.name.replace(/\.svg$/i, '') : 'vector';
    downloadBlob(pngBlob, `${base}.png`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!svgText ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <input ref={inputRef} type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files?.[0] || null)} />
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <FileCode size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an SVG file to convert to PNG
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Render at 1x, 2x, 4x, 8x or custom high-res dimensions with transparency &bull; 100% Client-side
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Resolution Scale</h3>
              <Button variant="ghost" size="sm" onClick={() => setSvgText('')}>Change SVG</Button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 4, 8].map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setScale(s);
                    setMode('scale');
                    renderPng(svgText, s, customW, customH, 'scale');
                  }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: '1px solid',
                    borderColor: mode === 'scale' && scale === s ? 'var(--color-accent)' : 'var(--color-border)',
                    background: mode === 'scale' && scale === s ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                    color: mode === 'scale' && scale === s ? 'var(--color-accent)' : 'var(--color-text)',
                    fontWeight: 700,
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>

            {pngBlob && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                  Output Size: <strong>{formatFileSize(pngBlob.size)}</strong>
                </span>
                <Button onClick={handleDownload} loading={isProcessing} icon={<Download size={15} />}>
                  Download PNG
                </Button>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden',
              background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pngPreview || ''}
                alt="PNG Rendered"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
