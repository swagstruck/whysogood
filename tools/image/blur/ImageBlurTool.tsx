'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Blend, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function ImageBlurTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blurRadius, setBlurRadius] = useState<number>(8);
  const [blurredBlob, setBlurredBlob] = useState<Blob | null>(null);
  const [blurredPreview, setBlurredPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setBlurredBlob(null);
    setBlurredPreview(null);
  };

  const applyBlur = async (radius: number) => {
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

      ctx.filter = `blur(${radius}px)`;
      ctx.drawImage(img, 0, 0);

      const mime = file.type || 'image/png';
      canvas.toBlob(blob => {
        if (blob) {
          setBlurredBlob(blob);
          if (blurredPreview) URL.revokeObjectURL(blurredPreview);
          setBlurredPreview(URL.createObjectURL(blob));
        }
      }, mime);
    } catch {
      toast.error('Blur failed');
    }
  };

  useEffect(() => {
    if (file && previewUrl) {
      const t = setTimeout(() => applyBlur(blurRadius), 60);
      return () => clearTimeout(t);
    }
  }, [blurRadius, file, previewUrl]);

  const handleDownload = () => {
    if (!blurredBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.name.split('.').pop() || 'png';
    downloadBlob(blurredBlob, `${base}_blurred_${blurRadius}px.${ext}`);
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
            <Blend size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to blur
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Adjust Gaussian blur intensity &bull; 100% Client-side
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                <span>Blur Radius</span>
                <span style={{ color: 'var(--color-accent)' }}>{blurRadius} px</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={blurRadius}
                onChange={e => setBlurRadius(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-faint)', marginTop: 4 }}>
                <span>0 px (None)</span>
                <span>25 px</span>
                <span>50 px (Max)</span>
              </div>
            </div>

            {blurredBlob && (
              <Button onClick={handleDownload} icon={<Download size={15} />}>
                Download Blurred Image
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
                src={blurredPreview || previewUrl || ''}
                alt="Blurred preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
