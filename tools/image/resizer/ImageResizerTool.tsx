'use client';
import React, { useState, useRef } from 'react';
import { Download, RefreshCw, Lock, Unlock, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FieldMessage } from '@/components/ui/FieldMessage';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

const MAX_DIM = 16383;

function validateDims(w: number, h: number): { wErr?: string; hErr?: string } {
  const wErr =
    !w || w < 1 ? 'Width must be at least 1 px.' :
    w > MAX_DIM ? `Width cannot exceed ${MAX_DIM} px.` : undefined;
  const hErr =
    !h || h < 1 ? 'Height must be at least 1 px.' :
    h > MAX_DIM ? `Height cannot exceed ${MAX_DIM} px.` : undefined;
  return { wErr, hErr };
}

export default function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [format, setFormat] = useState<'original' | 'image/jpeg' | 'image/png' | 'image/webp'>('original');
  const [quality, setQuality] = useState(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [resizedPreview, setResizedPreview] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const { wErr, hErr } = touched ? validateDims(width, height) : {};

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setTouched(false);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setResizedBlob(null);
    setResizedPreview(null);
    const img = new Image();
    img.onload = () => {
      setOriginalWidth(img.naturalWidth);
      setOriginalHeight(img.naturalHeight);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
    };
    img.src = url;
  };

  const handleWidthChange = (val: string) => {
    setTouched(true);
    const newW = Number(val);
    setWidth(newW);
    if (lockRatio && originalWidth > 0 && newW > 0) {
      setHeight(Math.round((newW / originalWidth) * originalHeight));
    }
  };

  const handleHeightChange = (val: string) => {
    setTouched(true);
    const newH = Number(val);
    setHeight(newH);
    if (lockRatio && originalHeight > 0 && newH > 0) {
      setWidth(Math.round((newH / originalHeight) * originalWidth));
    }
  };

  const handlePreset = (pct: number) => {
    if (originalWidth === 0) return;
    setTouched(false);
    setWidth(Math.round(originalWidth * (pct / 100)));
    setHeight(Math.round(originalHeight * (pct / 100)));
  };

  const handleResize = async () => {
    setTouched(true);
    const { wErr, hErr } = validateDims(width, height);
    if (wErr || hErr) return;
    if (!previewUrl) return;
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = previewUrl; });
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      const targetMime = format === 'original' ? (file?.type || 'image/jpeg') : format;
      const qVal = targetMime === 'image/png' ? undefined : quality / 100;
      canvas.toBlob(blob => {
        if (blob) {
          setResizedBlob(blob);
          if (resizedPreview) URL.revokeObjectURL(resizedPreview);
          setResizedPreview(URL.createObjectURL(blob));
          toast.success(`Resized to ${width} × ${height}`);
        }
        setIsProcessing(false);
      }, targetMime, qVal);
    } catch {
      setIsProcessing(false);
      toast.error('Resize failed');
    }
  };

  const handleDownload = () => {
    if (!resizedBlob || !file) return;
    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : file.name.split('.').pop();
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    downloadBlob(resizedBlob, `${base}_${width}x${height}.${ext}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!file ? (
        <div
          role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer' }}
        >
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
          <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <ImageIcon size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>Choose an image to resize</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>PNG, JPG, WebP, AVIF, BMP, GIF &bull; 100% Client-side</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                  Original: {originalWidth} × {originalHeight} px ({formatFileSize(file.size)})
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
            </div>

            {/* Presets */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>Quick Scale</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[25, 50, 75, 150, 200].map(pct => (
                  <button key={pct} onClick={() => handlePreset(pct)} className="btn-secondary" style={{ height: 28, padding: '0 10px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dimensions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'flex-start' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Width (px)</label>
                <input
                  type="number"
                  value={width || ''}
                  min={1}
                  max={MAX_DIM}
                  onChange={e => handleWidthChange(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className={`input-base${wErr ? ' input-base--error' : ''}`}
                  aria-invalid={wErr ? 'true' : undefined}
                  style={{ width: '100%', height: 38, padding: '0 10px', fontSize: 14, boxSizing: 'border-box' }}
                />
                {wErr && <FieldMessage variant="error">{wErr}</FieldMessage>}
              </div>

              <button
                onClick={() => setLockRatio(!lockRatio)}
                title={lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                style={{ marginTop: 22, border: 'none', background: 'var(--color-surface2)', color: lockRatio ? 'var(--color-accent)' : 'var(--color-faint)', padding: 8, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              >
                {lockRatio ? <Lock size={16} /> : <Unlock size={16} />}
              </button>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Height (px)</label>
                <input
                  type="number"
                  value={height || ''}
                  min={1}
                  max={MAX_DIM}
                  onChange={e => handleHeightChange(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className={`input-base${hErr ? ' input-base--error' : ''}`}
                  aria-invalid={hErr ? 'true' : undefined}
                  style={{ width: '100%', height: 38, padding: '0 10px', fontSize: 14, boxSizing: 'border-box' }}
                />
                {hErr && <FieldMessage variant="error">{hErr}</FieldMessage>}
              </div>
            </div>

            {/* Output Format */}
            <Select
              label="Format"
              selectSize="sm"
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
              options={[
                { value: 'original', label: 'Keep Original' },
                { value: 'image/jpeg', label: 'JPEG (.jpg)' },
                { value: 'image/png', label: 'PNG (.png)' },
                { value: 'image/webp', label: 'WebP (.webp)' },
              ]}
            />

            {format !== 'image/png' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>Quality</span><span>{quality}%</span>
                </div>
                <input
                  type="range" min={10} max={100} value={quality}
                  onChange={e => setQuality(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
                {quality < 40 && (
                  <FieldMessage variant="warning">Low quality may produce visible compression artefacts.</FieldMessage>
                )}
              </div>
            )}

            <Button onClick={handleResize} loading={isProcessing}>Resize Image</Button>
          </div>

          {/* Preview & Download */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resizedPreview || previewUrl || ''} alt="Preview" style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }} />
            </div>
            {resizedBlob && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                  New Size: <strong>{width} × {height} px</strong> &bull; {formatFileSize(resizedBlob.size)}
                </span>
                <Button onClick={handleDownload} icon={<Download size={14} />}>Download Resized Image</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
