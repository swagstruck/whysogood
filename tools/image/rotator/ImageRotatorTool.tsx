'use client';
import React, { useState, useRef } from 'react';
import { RotateCw, RotateCcw, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function ImageRotatorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [angle, setAngle] = useState(0);
  const [rotatedBlob, setRotatedBlob] = useState<Blob | null>(null);
  const [rotatedPreview, setRotatedPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setAngle(0);
    setRotatedBlob(null);
    setRotatedPreview(null);
  };

  const applyRotation = async (newAngle: number) => {
    setAngle(newAngle);
    if (!previewUrl || !file) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(res => {
        img.onload = res;
        img.src = previewUrl;
      });

      const radians = (newAngle * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const newWidth = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
      const newHeight = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const mime = file.type || 'image/png';
      canvas.toBlob(blob => {
        if (blob) {
          setRotatedBlob(blob);
          if (rotatedPreview) URL.revokeObjectURL(rotatedPreview);
          setRotatedPreview(URL.createObjectURL(blob));
        }
      }, mime);
    } catch {
      toast.error('Rotation failed');
    }
  };

  const handleRotateStep = (delta: number) => {
    const next = (angle + delta) % 360;
    applyRotation(next);
  };

  const handleDownload = () => {
    if (!rotatedBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.name.split('.').pop() || 'png';
    downloadBlob(rotatedBlob, `${base}_rotated_${angle}deg.${ext}`);
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
            <RotateCw size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to rotate
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            90°, 180°, 270° or arbitrary angles with auto-bounding box &bull; 100% Client-side
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

            {/* Quick Rotate Buttons */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>
                Quick Rotate
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => handleRotateStep(-90)} icon={<RotateCcw size={14} />}>
                  -90°
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleRotateStep(90)} icon={<RotateCw size={14} />}>
                  +90°
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleRotateStep(180)}>
                  180°
                </Button>
                <Button variant="ghost" size="sm" onClick={() => applyRotation(0)}>
                  Reset
                </Button>
              </div>
            </div>

            {/* Custom Angle Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                <span>Custom Angle</span>
                <span style={{ color: 'var(--color-accent)' }}>{angle}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={angle}
                onChange={e => applyRotation(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
            </div>

            {rotatedBlob && (
              <Button onClick={handleDownload} icon={<Download size={15} />}>
                Download Rotated Image
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
                src={rotatedPreview || previewUrl || ''}
                alt="Rotated preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
