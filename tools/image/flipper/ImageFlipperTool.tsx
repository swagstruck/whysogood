'use client';
import React, { useState, useRef } from 'react';
import { FlipHorizontal, FlipVertical, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function ImageFlipperTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [flippedBlob, setFlippedBlob] = useState<Blob | null>(null);
  const [flippedPreview, setFlippedPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setFlipH(false);
    setFlipV(false);
    setFlippedBlob(null);
    setFlippedPreview(null);
  };

  const applyFlip = async (h: boolean, v: boolean) => {
    setFlipH(h);
    setFlipV(v);
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

      ctx.save();
      ctx.translate(h ? canvas.width : 0, v ? canvas.height : 0);
      ctx.scale(h ? -1 : 1, v ? -1 : 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      const mime = file.type || 'image/png';
      canvas.toBlob(blob => {
        if (blob) {
          setFlippedBlob(blob);
          if (flippedPreview) URL.revokeObjectURL(flippedPreview);
          setFlippedPreview(URL.createObjectURL(blob));
        }
      }, mime);
    } catch {
      toast.error('Flip failed');
    }
  };

  const handleDownload = () => {
    if (!flippedBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.name.split('.').pop() || 'png';
    const tag = flipH && flipV ? 'flipped_both' : flipH ? 'flipped_h' : 'flipped_v';
    downloadBlob(flippedBlob, `${base}_${tag}.${ext}`);
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
            <FlipHorizontal size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to flip
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Mirror horizontally or vertically &bull; 100% Client-side
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
                Flip Options
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant={flipH ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => applyFlip(!flipH, flipV)}
                  icon={<FlipHorizontal size={14} />}
                >
                  Horizontal (Mirror)
                </Button>
                <Button
                  variant={flipV ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => applyFlip(flipH, !flipV)}
                  icon={<FlipVertical size={14} />}
                >
                  Vertical
                </Button>
                <Button variant="ghost" size="sm" onClick={() => applyFlip(false, false)}>
                  Reset
                </Button>
              </div>
            </div>

            {flippedBlob && (
              <Button onClick={handleDownload} icon={<Download size={15} />}>
                Download Flipped Image
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
                src={flippedPreview || previewUrl || ''}
                alt="Flipped preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
