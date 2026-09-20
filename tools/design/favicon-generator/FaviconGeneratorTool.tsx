'use client';
import React, { useState, useRef } from 'react';
import { Download, Archive, Image as ImageIcon, Smile, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { zipSync } from 'fflate';

const SIZES = [
  { name: 'favicon-16x16.png', size: 16, label: '16×16 Browser Tab' },
  { name: 'favicon-32x32.png', size: 32, label: '32×32 Taskbar / Retina' },
  { name: 'favicon-48x48.png', size: 48, label: '48×48 Desktop Shortcut' },
  { name: 'apple-touch-icon.png', size: 180, label: '180×180 Apple Touch' },
  { name: 'android-chrome-192x192.png', size: 192, label: '192×192 Android' },
  { name: 'android-chrome-512x512.png', size: 512, label: '512×512 PWA Splash' },
];

export default function FaviconGeneratorTool() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [emoji, setEmoji] = useState('⚡');
  const [mode, setMode] = useState<'emoji' | 'image'>('emoji');
  const [bgColor, setBgColor] = useState('#6366F1');
  const [shape, setShape] = useState<'square' | 'rounded' | 'circle'>('rounded');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSourceImage(url);
    setMode('image');
  };

  const renderToCanvas = async (dimension: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = dimension;
    canvas.height = dimension;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Draw background shape
    ctx.fillStyle = bgColor;
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(dimension / 2, dimension / 2, dimension / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.fill();
    } else if (shape === 'rounded') {
      const radius = dimension * 0.22;
      ctx.beginPath();
      ctx.roundRect(0, 0, dimension, dimension, radius);
      ctx.fill();
      ctx.clip();
    } else {
      ctx.fillRect(0, 0, dimension, dimension);
    }

    if (mode === 'image' && sourceImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(resolve => {
        img.onload = resolve;
        img.src = sourceImage;
      });
      ctx.drawImage(img, 0, 0, dimension, dimension);
    } else {
      // Draw emoji
      ctx.font = `${dimension * 0.65}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, dimension / 2, dimension / 2 + dimension * 0.05);
    }

    return canvas;
  };

  const downloadSingleSize = async (sizeObj: typeof SIZES[0]) => {
    const canvas = await renderToCanvas(sizeObj.size);
    canvas.toBlob(blob => {
      if (blob) {
        downloadBlob(blob, sizeObj.name);
        toast.success(`Downloaded ${sizeObj.name}`);
      }
    }, 'image/png');
  };

  const downloadZipPackage = async () => {
    toast.info('Building Favicon package...');
    const zipFiles: Record<string, Uint8Array> = {};

    for (const item of SIZES) {
      const canvas = await renderToCanvas(item.size);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (blob) {
        zipFiles[item.name] = new Uint8Array(await blob.arrayBuffer());
      }
    }

    // Also include a 32x32 as favicon.ico
    const icoCanvas = await renderToCanvas(32);
    const icoBlob = await new Promise<Blob | null>(res => icoCanvas.toBlob(res, 'image/png'));
    if (icoBlob) {
      zipFiles['favicon.ico'] = new Uint8Array(await icoBlob.arrayBuffer());
    }

    // Include HTML snippet text file
    const snippet = `<!-- Favicon HTML snippet -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
`;
    zipFiles['favicon_instructions.html'] = new TextEncoder().encode(snippet);

    const zipped = zipSync(zipFiles);
    downloadBlob(new Blob([zipped as unknown as BlobPart], { type: 'application/zip' }), 'favicons.zip');
    toast.success('Downloaded complete Favicon package!');
  };

  const htmlCodeSnippet = `<link rel="icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Creator & Preview Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Controls */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant={mode === 'emoji' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMode('emoji')}
              icon={<Smile size={14} />}
            >
              Emoji / Text
            </Button>
            <Button
              variant={mode === 'image' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => inputRef.current?.click()}
              icon={<ImageIcon size={14} />}
            >
              Upload Image
            </Button>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>

          {/* Emoji Input */}
          {mode === 'emoji' ? (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>
                Emoji or Single Character
              </label>
              <input
                value={emoji}
                maxLength={4}
                onChange={e => setEmoji(e.target.value || '⚡')}
                className="input-base"
                style={{ width: '100%', height: 44, fontSize: 22, textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>
          ) : (
            <div>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Using uploaded custom image</span>
            </div>
          )}

          {/* Background Color & Shape */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-muted)' }}>
                Background
              </label>
              <input
                type="color"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                style={{ width: 44, height: 38, border: 'none', background: 'none', cursor: 'pointer' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-muted)' }}>
                Shape
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['rounded', 'circle', 'square'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setShape(s)}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                      fontSize: 12, textTransform: 'capitalize', cursor: 'pointer',
                      border: '1px solid',
                      borderColor: shape === s ? 'var(--color-accent)' : 'var(--color-border)',
                      background: shape === s ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                      color: shape === s ? 'var(--color-accent)' : 'var(--color-text)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={downloadZipPackage} icon={<Archive size={15} />}>
            Download Favicon Package (ZIP)
          </Button>
        </div>

        {/* Browser Mock Preview */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Live Browser Tab Mockup
          </h3>

          {/* Dark Tab Preview */}
          <div style={{
            background: '#18181b', borderRadius: 'var(--radius-md)', padding: '10px 14px',
            border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? 5 : 0,
              background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, overflow: 'hidden',
            }}>
              {mode === 'image' && sourceImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sourceImage} alt="Favicon preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                emoji
              )}
            </div>
            <span style={{ fontSize: 13, color: '#f4f4f5', fontWeight: 500 }}>My Website &mdash; Homepage</span>
          </div>

          {/* Light Tab Preview */}
          <div style={{
            background: '#e4e4e7', borderRadius: 'var(--radius-md)', padding: '10px 14px',
            border: '1px solid #d4d4d8', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: shape === 'circle' ? '50%' : shape === 'rounded' ? 5 : 0,
              background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, overflow: 'hidden',
            }}>
              {mode === 'image' && sourceImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sourceImage} alt="Favicon preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                emoji
              )}
            </div>
            <span style={{ fontSize: 13, color: '#18181b', fontWeight: 500 }}>My Website &mdash; Homepage</span>
          </div>

          {/* HTML Snippet copy */}
          <div style={{ marginTop: 'auto', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)' }}>HTML Snippet</span>
              <button
                onClick={async () => {
                  await copyToClipboard(htmlCodeSnippet);
                  setCopied(true);
                  toast.success('Snippet copied');
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{ border: 'none', background: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />} Copy
              </button>
            </div>
            <pre style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', overflowX: 'auto' }}>
              {htmlCodeSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* Sizes List */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>
          Individual Size Exports
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {SIZES.map(item => (
            <div key={item.name} style={{
              padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{item.label}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => downloadSingleSize(item)}>
                <Download size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
