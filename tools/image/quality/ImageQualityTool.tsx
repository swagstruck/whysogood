'use client';
import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function ImageQualityTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [adjustedBlob, setAdjustedBlob] = useState<Blob | null>(null);
  const [adjustedPreview, setAdjustedPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setAdjustedBlob(null);
    setAdjustedPreview(null);
  };

  const reencode = async (qVal: number, fmt: 'image/jpeg' | 'image/webp') => {
    if (!previewUrl || !file) return;

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

      if (fmt === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(blob => {
        if (blob) {
          setAdjustedBlob(blob);
          if (adjustedPreview) URL.revokeObjectURL(adjustedPreview);
          setAdjustedPreview(URL.createObjectURL(blob));
        }
      }, fmt, qVal / 100);
    } catch {
      toast.error('Failed to change quality');
    }
  };

  useEffect(() => {
    if (file && previewUrl) {
      const timer = setTimeout(() => {
        reencode(quality, format);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [quality, format, file, previewUrl]);

  const handleDownload = () => {
    if (!adjustedBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = format === 'image/jpeg' ? 'jpg' : 'webp';
    downloadBlob(adjustedBlob, `${base}_q${quality}.${ext}`);
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
            <SlidersHorizontal size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to adjust quality
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Fine-tune quality vs file size in real time &bull; 100% Client-side
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                  Original size: {formatFileSize(file.size)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                <span>Quality Level</span>
                <span style={{ color: 'var(--color-accent)' }}>{quality}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-faint)', marginTop: 4 }}>
                <span>5% (Tiny, artifacts)</span>
                <span>50%</span>
                <span>100% (Near lossless)</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Format</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setFormat('image/jpeg')}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: '1px solid',
                    borderColor: format === 'image/jpeg' ? 'var(--color-accent)' : 'var(--color-border)',
                    background: format === 'image/jpeg' ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                    color: format === 'image/jpeg' ? 'var(--color-accent)' : 'var(--color-text)',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  JPEG
                </button>
                <button
                  onClick={() => setFormat('image/webp')}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: '1px solid',
                    borderColor: format === 'image/webp' ? 'var(--color-accent)' : 'var(--color-border)',
                    background: format === 'image/webp' ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                    color: format === 'image/webp' ? 'var(--color-accent)' : 'var(--color-text)',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  WebP
                </button>
              </div>
            </div>

            {adjustedBlob && (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
              }}>
                <span>New size: <strong>{formatFileSize(adjustedBlob.size)}</strong></span>
                <span style={{ color: adjustedBlob.size < file.size ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
                  {adjustedBlob.size < file.size ? `-${calcReductionPct(file.size, adjustedBlob.size)}% smaller` : `+${calcReductionPct(adjustedBlob.size, file.size)}%`}
                </span>
              </div>
            )}

            {adjustedBlob && (
              <Button onClick={handleDownload} icon={<Download size={15} />}>
                Download Image ({formatFileSize(adjustedBlob.size)})
              </Button>
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
                src={adjustedPreview || previewUrl || ''}
                alt="Quality preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
