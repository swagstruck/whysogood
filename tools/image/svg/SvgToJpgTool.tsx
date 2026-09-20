'use client';
import React, { useState, useRef } from 'react';
import { ArrowRight, Download, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function SvgToJpgTool() {
  const [file, setFile] = useState<File | null>(null);
  const [svgText, setSvgText] = useState('');
  const [scale, setScale] = useState(2);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [quality, setQuality] = useState(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jpgBlob, setJpgBlob] = useState<Blob | null>(null);
  const [jpgPreview, setJpgPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileUpload = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setSvgText(text);
      renderJpg(text, scale, bgColor, quality);
    };
    reader.readAsText(f);
  };

  const renderJpg = async (svgStr: string, sc: number, bg: string, qVal: number) => {
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

      const targetW = (img.naturalWidth || 500) * sc;
      const targetH = (img.naturalHeight || 500) * sc;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);
      URL.revokeObjectURL(url);

      canvas.toBlob(outBlob => {
        if (outBlob) {
          setJpgBlob(outBlob);
          if (jpgPreview) URL.revokeObjectURL(jpgPreview);
          setJpgPreview(URL.createObjectURL(outBlob));
          toast.success(`Rendered to JPEG`);
        }
        setIsProcessing(false);
      }, 'image/jpeg', qVal / 100);
    } catch {
      setIsProcessing(false);
      toast.error('Failed to render SVG to JPEG');
    }
  };

  const handleDownload = () => {
    if (!jpgBlob) return;
    const base = file ? file.name.replace(/\.svg$/i, '') : 'vector';
    downloadBlob(jpgBlob, `${base}.jpg`);
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
            Choose an SVG file to convert to JPEG
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Custom background color fill &bull; Quality slider &bull; 100% Client-side
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Render Options</h3>
              <Button variant="ghost" size="sm" onClick={() => setSvgText('')}>Change SVG</Button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>
                Resolution Scale
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 4].map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setScale(s);
                      renderJpg(svgText, s, bgColor, quality);
                    }}
                    style={{
                      flex: 1, padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      border: '1px solid',
                      borderColor: scale === s ? 'var(--color-accent)' : 'var(--color-border)',
                      background: scale === s ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                      color: scale === s ? 'var(--color-accent)' : 'var(--color-text)',
                      fontWeight: 700,
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>
                  Background
                </label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => {
                    setBgColor(e.target.value);
                    renderJpg(svgText, scale, e.target.value, quality);
                  }}
                  style={{ width: 44, height: 36, border: 'none', background: 'none', cursor: 'pointer' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>Quality</span>
                  <span>{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={e => {
                    setQuality(Number(e.target.value));
                    renderJpg(svgText, scale, bgColor, Number(e.target.value));
                  }}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
              </div>
            </div>

            {jpgBlob && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                  Output Size: <strong>{formatFileSize(jpgBlob.size)}</strong>
                </span>
                <Button onClick={handleDownload} loading={isProcessing} icon={<Download size={15} />}>
                  Download JPEG
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
                src={jpgPreview || ''}
                alt="JPEG Rendered"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
