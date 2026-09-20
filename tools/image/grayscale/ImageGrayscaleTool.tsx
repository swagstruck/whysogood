'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Contrast, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

type FilterMode = 'grayscale' | 'sepia' | 'contrast' | 'invert';

export default function ImageGrayscaleTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<FilterMode>('grayscale');
  const [intensity, setIntensity] = useState(100);
  const [filteredBlob, setFilteredBlob] = useState<Blob | null>(null);
  const [filteredPreview, setFilteredPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setFilteredBlob(null);
    setFilteredPreview(null);
  };

  const applyFilter = async () => {
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

      if (mode === 'grayscale') {
        ctx.filter = `grayscale(${intensity}%)`;
      } else if (mode === 'sepia') {
        ctx.filter = `sepia(${intensity}%)`;
      } else if (mode === 'contrast') {
        ctx.filter = `grayscale(100%) contrast(${100 + intensity}%)`;
      } else if (mode === 'invert') {
        ctx.filter = `invert(${intensity}%)`;
      }

      ctx.drawImage(img, 0, 0);

      const mime = file.type || 'image/png';
      canvas.toBlob(blob => {
        if (blob) {
          setFilteredBlob(blob);
          if (filteredPreview) URL.revokeObjectURL(filteredPreview);
          setFilteredPreview(URL.createObjectURL(blob));
        }
      }, mime);
    } catch {
      toast.error('Filter failed');
    }
  };

  useEffect(() => {
    if (file && previewUrl) {
      const t = setTimeout(applyFilter, 80);
      return () => clearTimeout(t);
    }
  }, [mode, intensity, file, previewUrl]);

  const handleDownload = () => {
    if (!filteredBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.name.split('.').pop() || 'png';
    downloadBlob(filteredBlob, `${base}_${mode}.${ext}`);
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
            <Contrast size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to convert to grayscale / B&amp;W
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Standard Grayscale, High Contrast, Sepia and Inverted &bull; 100% Client-side
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
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>
                Filter Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: 'grayscale', label: 'Black & White' },
                  { id: 'sepia', label: 'Vintage Sepia' },
                  { id: 'contrast', label: 'High Contrast' },
                  { id: 'invert', label: 'Invert Colors' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id as FilterMode)}
                    style={{
                      padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer',
                      border: '1px solid',
                      borderColor: mode === item.id ? 'var(--color-accent)' : 'var(--color-border)',
                      background: mode === item.id ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                      color: mode === item.id ? 'var(--color-accent)' : 'var(--color-text)',
                      fontWeight: 600,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span>Intensity</span>
                <span style={{ color: 'var(--color-accent)' }}>{intensity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={intensity}
                onChange={e => setIntensity(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
            </div>

            {filteredBlob && (
              <Button onClick={handleDownload} icon={<Download size={15} />}>
                Download Styled Image
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
                src={filteredPreview || previewUrl || ''}
                alt="Grayscale preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
