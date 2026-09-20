'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Stamp, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FieldMessage } from '@/components/ui/FieldMessage';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

type Position = 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'tiled';

export default function ImageWatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState('© Confidential');
  const [fontSize, setFontSize] = useState(36);
  const [color, setColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(60);
  const [position, setPosition] = useState<Position>('bottom-right');
  const [watermarkedBlob, setWatermarkedBlob] = useState<Blob | null>(null);
  const [watermarkedPreview, setWatermarkedPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const textErr = text.trim().length === 0
    ? 'Watermark text cannot be empty.'
    : text.length > 200
    ? 'Watermark text must be 200 characters or fewer.'
    : undefined;

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setWatermarkedBlob(null);
    setWatermarkedPreview(null);
  };

  const applyWatermark = async () => {
    if (!previewUrl || !file || textErr) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(res => { img.onload = res; img.src = previewUrl; });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textBaseline = 'middle';
      const padding = 24;
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width;
      const textH = fontSize;
      if (position === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      } else if (position === 'bottom-right') {
        ctx.textAlign = 'right';
        ctx.fillText(text, canvas.width - padding, canvas.height - padding - textH / 2);
      } else if (position === 'bottom-left') {
        ctx.textAlign = 'left';
        ctx.fillText(text, padding, canvas.height - padding - textH / 2);
      } else if (position === 'top-right') {
        ctx.textAlign = 'right';
        ctx.fillText(text, canvas.width - padding, padding + textH / 2);
      } else if (position === 'top-left') {
        ctx.textAlign = 'left';
        ctx.fillText(text, padding, padding + textH / 2);
      } else if (position === 'tiled') {
        ctx.textAlign = 'center';
        const stepX = textW + 100;
        const stepY = textH + 80;
        for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
          for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((-30 * Math.PI) / 180);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }
      }
      ctx.restore();
      const mime = file.type || 'image/png';
      canvas.toBlob(blob => {
        if (blob) {
          setWatermarkedBlob(blob);
          if (watermarkedPreview) URL.revokeObjectURL(watermarkedPreview);
          setWatermarkedPreview(URL.createObjectURL(blob));
        }
      }, mime);
    } catch {
      toast.error('Watermarking failed');
    }
  };

  useEffect(() => {
    if (file && previewUrl && !textErr) {
      const timer = setTimeout(applyWatermark, 150);
      return () => clearTimeout(timer);
    }
  }, [text, fontSize, color, opacity, position, file, previewUrl, textErr]);

  const handleDownload = () => {
    if (!watermarkedBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.name.split('.').pop() || 'png';
    downloadBlob(watermarkedBlob, `${base}_watermarked.${ext}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!file ? (
        <div role="button" tabIndex={0} onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer' }}>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
          <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Stamp size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>Choose an image to watermark</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>Add text, copyright or diagonal pattern watermarks &bull; 100% Client-side</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>{formatFileSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
            </div>

            {/* Watermark text with validation */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Watermark Text</label>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={200}
                className={`input-base${textErr ? ' input-base--error' : ''}`}
                aria-invalid={textErr ? 'true' : undefined}
                style={{ width: '100%', height: 38, padding: '0 10px', fontSize: 14, boxSizing: 'border-box' }}
              />
              {textErr
                ? <FieldMessage variant="error">{textErr}</FieldMessage>
                : <FieldMessage variant="hint">{200 - text.length} characters remaining</FieldMessage>
              }
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Size ({fontSize}px)</label>
                <input type="range" min={12} max={120} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-accent)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Opacity ({opacity}%)</label>
                <input type="range" min={10} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-accent)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Color</label>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 44, height: 36, border: 'none', background: 'none', cursor: 'pointer' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Position</label>
                <select value={position} onChange={e => setPosition(e.target.value as Position)}
                  style={{ width: '100%', height: 36, padding: '0 10px', background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: 13, outline: 'none' }}>
                  <option value="center">Center</option>
                  <option value="bottom-right">Bottom-Right</option>
                  <option value="bottom-left">Bottom-Left</option>
                  <option value="top-right">Top-Right</option>
                  <option value="top-left">Top-Left</option>
                  <option value="tiled">Tiled (Diagonal Pattern)</option>
                </select>
              </div>
            </div>

            {watermarkedBlob && !textErr && (
              <Button onClick={handleDownload} icon={<Download size={15} />}>Download Watermarked Image</Button>
            )}
          </div>

          <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={watermarkedPreview || previewUrl || ''} alt="Watermark preview" style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
