'use client';
import React, { useState, useRef } from 'react';
import { RefreshCw, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

const FORMATS = [
  { label: 'PNG (Lossless)', value: 'image/png', ext: 'png' },
  { label: 'JPEG (.jpg)', value: 'image/jpeg', ext: 'jpg' },
  { label: 'WebP (Modern)', value: 'image/webp', ext: 'webp' },
  { label: 'BMP (Bitmap)', value: 'image/bmp', ext: 'bmp' },
];

export default function ImageConverterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState('image/webp');
  const [quality, setQuality] = useState(85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setConvertedBlob(null);
    setConvertedPreview(null);
  };

  const handleConvert = async () => {
    if (!previewUrl || !file) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(res => {
        img.onload = res;
        img.src = previewUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill white background for non-alpha formats like JPEG/BMP
      if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const q = targetFormat === 'image/png' ? undefined : quality / 100;
      canvas.toBlob(blob => {
        if (blob) {
          setConvertedBlob(blob);
          if (convertedPreview) URL.revokeObjectURL(convertedPreview);
          setConvertedPreview(URL.createObjectURL(blob));
          toast.success('Converted successfully');
        }
        setIsProcessing(false);
      }, targetFormat, q);
    } catch {
      setIsProcessing(false);
      toast.error('Conversion failed');
    }
  };

  const handleDownload = () => {
    if (!convertedBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const fmtObj = FORMATS.find(f => f.value === targetFormat);
    const ext = fmtObj ? fmtObj.ext : 'img';
    downloadBlob(convertedBlob, `${base}.${ext}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!file ? (
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
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <RefreshCw size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to convert
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Convert between JPG, PNG, WebP, BMP and other formats &bull; 100% Client-side
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>{formatFileSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>
                Target Format
              </label>
              <select
                value={targetFormat}
                onChange={e => setTargetFormat(e.target.value)}
                style={{
                  width: '100%', height: 38, padding: '0 10px', background: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)', fontSize: 13, outline: 'none',
                }}
              >
                {FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {targetFormat !== 'image/png' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>Quality</span>
                  <span>{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={e => setQuality(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
              </div>
            )}

            <Button onClick={handleConvert} loading={isProcessing}>
              Convert Image
            </Button>

            {convertedBlob && (
              <Button onClick={handleDownload} icon={<Download size={15} />}>
                Download Converted Image
              </Button>
            )}
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden',
              background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={convertedPreview || previewUrl || ''}
                alt="Converted preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
            {convertedBlob && (
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                Result size: <strong>{formatFileSize(convertedBlob.size)}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
