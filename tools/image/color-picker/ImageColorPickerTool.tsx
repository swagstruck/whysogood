'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Pipette, Copy, Check, Palette, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

interface ColorInfo {
  hex: string;
  rgb: string;
  hsl: string;
  r: number;
  g: number;
  b: number;
}

function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function componentToHex(c: number): string {
  const hex = c.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export default function ImageColorPickerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorInfo | null>(null);
  const [dominantColors, setDominantColors] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      // Extract dominant colors from sample points
      extractPalette(ctx, img.naturalWidth, img.naturalHeight);

      // Default pick center color
      const cx = Math.floor(img.naturalWidth / 2);
      const cy = Math.floor(img.naturalHeight / 2);
      pickPixel(ctx, cx, cy);
    };
    img.src = url;
  };

  const pickPixel = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    const hex = rgbToHex(r, g, b);
    const rgb = `rgb(${r}, ${g}, ${b})`;
    const hsl = rgbToHsl(r, g, b);
    setSelectedColor({ hex, rgb, hsl, r, g, b });
  };

  const extractPalette = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const colors: Record<string, number> = {};
    const stepX = Math.max(1, Math.floor(w / 30));
    const stepY = Math.max(1, Math.floor(h / 30));

    for (let x = 0; x < w; x += stepX) {
      for (let y = 0; y < h; y += stepY) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        // Quantize slightly
        const r = Math.round(p[0] / 24) * 24;
        const g = Math.round(p[1] / 24) * 24;
        const b = Math.round(p[2] / 24) * 24;
        const hex = rgbToHex(r, g, b);
        colors[hex] = (colors[hex] || 0) + 1;
      }
    }

    const sorted = Object.entries(colors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);
    setDominantColors(sorted);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) pickPixel(ctx, x, y);
  };

  const copyVal = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    toast.success(`Copied ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
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
            <Pipette size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to pick colors
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Click anywhere to inspect pixels, get HEX/RGB/HSL and auto-extract palettes &bull; 100% Client-side
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Color Info Card */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Selected Color</h3>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change Image</Button>
            </div>

            {selectedColor && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 'var(--radius-md)',
                  background: selectedColor.hex, border: '2px solid var(--color-border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
                    {selectedColor.hex.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                    Click anywhere on the image to inspect
                  </div>
                </div>
              </div>
            )}

            {/* Formats Copy */}
            {selectedColor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'HEX', val: selectedColor.hex.toUpperCase() },
                  { label: 'RGB', val: selectedColor.rgb },
                  { label: 'HSL', val: selectedColor.hsl },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{item.val}</span>
                    <button
                      onClick={() => copyVal(item.val, item.label)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}
                    >
                      {copiedKey === item.label ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Dominant Palette */}
            {dominantColors.length > 0 && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', marginBottom: 8 }}>
                  <Palette size={14} />
                  <span>Dominant Palette</span>
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {dominantColors.map(hex => (
                    <button
                      key={hex}
                      onClick={() => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        setSelectedColor({ hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: rgbToHsl(r, g, b), r, g, b });
                      }}
                      title={hex}
                      style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                        background: hex, border: '1px solid var(--color-border)',
                        cursor: 'pointer', transition: 'transform 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canvas Interactive Viewer */}
          <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                maxWidth: '100%', maxHeight: 400, objectFit: 'contain',
                cursor: 'crosshair', borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
