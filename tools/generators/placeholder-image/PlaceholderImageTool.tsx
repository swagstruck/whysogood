'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { downloadBlob, copyToClipboard } from '@/lib/utils';
import {
  Download,
  Copy,
  Check,
  ImagePlus,
  Palette,
  Maximize2,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface Preset {
  label: string;
  w: number;
  h: number;
  tag: string;
}

const PRESETS: Preset[] = [
  { label: 'Full HD 1080p', w: 1920, h: 1080, tag: '16:9' },
  { label: '720p HD', w: 1280, h: 720, tag: '16:9' },
  { label: 'Social OG Image', w: 1200, h: 630, tag: 'Social' },
  { label: 'Square 1:1', w: 800, h: 800, tag: '1:1' },
  { label: 'Avatar / Icon', w: 400, h: 400, tag: '1:1' },
  { label: 'Standard 4:3', w: 800, h: 600, tag: '4:3' },
  { label: 'Mobile Screen', w: 390, h: 844, tag: 'Mobile' },
  { label: 'Banner / Header', w: 1500, h: 500, tag: 'Banner' },
];

const COLOR_PALETTES = [
  { label: 'Neutral Slate', bg: '#2b303c', text: '#f3f4f6' },
  { label: 'Light Studio', bg: '#e2e8f0', text: '#334155' },
  { label: 'Brand Blue', bg: '#1580d1', text: '#ffffff' },
  { label: 'Emerald Deep', bg: '#047857', text: '#ecfdf5' },
  { label: 'Sunset Amber', bg: '#d97706', text: '#fffbeb' },
  { label: 'Dark Carbon', bg: '#18181b', text: '#a1a1aa' },
];

export default function PlaceholderImageTool() {
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dimensions
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [lockAspect, setLockAspect] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<number>(800 / 600);

  // Appearance
  const [bgColor, setBgColor] = useState<string>('#e2e8f0');
  const [useGradient, setUseGradient] = useState<boolean>(false);
  const [bgGradientColor, setBgGradientColor] = useState<string>('#cbd5e1');
  const [textColor, setTextColor] = useState<string>('#334155');
  const [customText, setCustomText] = useState<string>('');
  const [fontFamily, setFontFamily] = useState<'sans' | 'mono' | 'serif'>('sans');
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp' | 'svg'>('png');

  // Copy feedback
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedDataUrl, setCopiedDataUrl] = useState<boolean>(false);

  // Display text computation
  const displayText = useMemo(() => {
    return customText.trim() ? customText.trim() : `${width} × ${height}`;
  }, [customText, width, height]);

  // Dimension setters with aspect-ratio lock
  const handleWidthChange = (newW: number) => {
    const val = Math.max(10, Math.min(newW, 4000));
    setWidth(val);
    if (lockAspect && aspectRatio > 0) {
      setHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (newH: number) => {
    const val = Math.max(10, Math.min(newH, 4000));
    setHeight(val);
    if (lockAspect && aspectRatio > 0) {
      setWidth(Math.round(val * aspectRatio));
    }
  };

  const handlePresetSelect = (p: Preset) => {
    setWidth(p.w);
    setHeight(p.h);
    setAspectRatio(p.w / p.h);
  };

  const toggleAspectLock = () => {
    if (!lockAspect) {
      setAspectRatio(width / height);
      setLockAspect(true);
      toast.success(`Aspect ratio locked (${(width / height).toFixed(2)})`);
    } else {
      setLockAspect(false);
      toast.success('Aspect ratio unlocked');
    }
  };

  // Render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Background
    if (useGradient) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, bgColor);
      grad.addColorStop(1, bgGradientColor);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, width, height);

    // Optional Wireframe Diagonals & Crosshair
    if (showWireframe) {
      ctx.strokeStyle = textColor;
      ctx.lineWidth = Math.max(1, Math.min(width, height) / 200);
      ctx.globalAlpha = 0.25;

      // Diagonal cross
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height);
      ctx.moveTo(width, 0);
      ctx.lineTo(0, height);
      ctx.stroke();

      // Border outline
      ctx.strokeRect(0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }

    // Text Render
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Responsive font size
    const baseSize = Math.max(14, Math.round(Math.min(width, height) / 10));
    const fontName =
      fontFamily === 'mono'
        ? 'var(--font-mono, monospace)'
        : fontFamily === 'serif'
        ? 'Georgia, serif'
        : 'var(--font-sans, sans-serif)';
    ctx.font = `700 ${baseSize}px ${fontName}`;

    // Handle multiline or single line
    const lines = displayText.split('\n');
    const lineHeight = baseSize * 1.3;
    const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startY + idx * lineHeight);
    });
  }, [
    width,
    height,
    bgColor,
    useGradient,
    bgGradientColor,
    textColor,
    displayText,
    fontFamily,
    showWireframe,
  ]);

  // Vector SVG generation
  const svgString = useMemo(() => {
    const bgDef = useGradient
      ? `<defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgColor}"/><stop offset="100%" stop-color="${bgGradientColor}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#grad)"/>`
      : `<rect width="100%" height="100%" fill="${bgColor}"/>`;

    const wireframeDef = showWireframe
      ? `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${textColor}" stroke-width="2" opacity="0.25"/><line x1="${width}" y1="0" x2="0" y2="${height}" stroke="${textColor}" stroke-width="2" opacity="0.25"/>`
      : '';

    const fontStyle =
      fontFamily === 'mono'
        ? 'font-family="monospace"'
        : fontFamily === 'serif'
        ? 'font-family="Georgia, serif"'
        : 'font-family="sans-serif"';

    const baseSize = Math.max(14, Math.round(Math.min(width, height) / 10));

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${bgDef}
  ${wireframeDef}
  <text x="${width / 2}" y="${height / 2}" ${fontStyle} font-size="${baseSize}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${displayText}</text>
</svg>`;
  }, [
    width,
    height,
    bgColor,
    useGradient,
    bgGradientColor,
    textColor,
    displayText,
    fontFamily,
    showWireframe,
  ]);

  // Actions
  const handleDownload = () => {
    if (format === 'svg') {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, `placeholder-${width}x${height}.svg`);
      toast.success('Downloaded SVG placeholder');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `placeholder-${width}x${height}.${format}`);
        toast.success(`Downloaded ${format.toUpperCase()} placeholder`);
      }
    }, mime, 0.92);
  };

  const handleCopyImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopiedImage(true);
          toast.success('Image copied to clipboard');
          setTimeout(() => setCopiedImage(false), 2000);
        } else {
          toast.error('Image clipboard copy not supported');
        }
      } catch {
        toast.error('Failed to copy image');
      }
    }, 'image/png');
  };

  const handleCopyDataUrl = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await copyToClipboard(dataUrl);
      setCopiedDataUrl(true);
      toast.success('Data URL copied to clipboard');
      setTimeout(() => setCopiedDataUrl(false), 2000);
    } catch {
      toast.error('Failed to copy Data URL');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Presets Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginRight: 4 }}>
          Common Sizes:
        </span>
        {PRESETS.map((p) => {
          const active = width === p.w && height === p.h;
          return (
            <button
              key={p.label}
              onClick={() => handlePresetSelect(p)}
              className="c-btn c-btn--ghost c-btn--sm"
              style={{
                fontSize: 12,
                whiteSpace: 'nowrap',
                background: active ? 'var(--brand-subtle, rgba(21, 128, 209, 0.12))' : undefined,
                color: active ? 'var(--brand)' : 'var(--ink-2)',
                border: active ? '1px solid var(--brand)' : '1px solid var(--border)',
              }}
            >
              <span>{p.label}</span>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 4 }}>
                ({p.w}×{p.h})
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Settings vs Live Canvas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Dimensions & Appearance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Dimensions Card */}
          <div className="c-card" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Maximize2 size={16} color="var(--brand-500)" />
                <span>Dimensions</span>
              </h3>
              <button
                onClick={toggleAspectLock}
                className="c-btn c-btn--ghost c-btn--sm"
                style={{
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: lockAspect ? 'var(--brand)' : 'var(--ink-2)',
                }}
              >
                {lockAspect ? <Lock size={13} /> : <Unlock size={13} />}
                <span>{lockAspect ? 'Locked' : 'Lock Ratio'}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="c-field">
                <label className="c-field__label">Width (px)</label>
                <input
                  type="number"
                  min="10"
                  max="4000"
                  className="c-field__input"
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                />
              </div>
              <div className="c-field">
                <label className="c-field__label">Height (px)</label>
                <input
                  type="number"
                  min="10"
                  max="4000"
                  className="c-field__input"
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="c-field" style={{ marginTop: 16 }}>
              <label className="c-field__label">Custom Label Text</label>
              <input
                type="text"
                className="c-field__input"
                placeholder={`Default: ${width} × ${height}`}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <span className="c-field__hint">Leave blank to display the image resolution.</span>
            </div>
          </div>

          {/* Color & Visual Styling Card */}
          <div className="c-card" style={{ padding: 20 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Palette size={16} color="var(--brand-500)" />
              <span>Color & Styling</span>
            </h3>

            {/* Quick Palettes */}
            <div style={{ marginBottom: 16 }}>
              <label
                className="c-field__label"
                style={{ display: 'block', marginBottom: 8 }}
              >
                Preset Themes
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {COLOR_PALETTES.map((cp) => (
                  <button
                    key={cp.label}
                    onClick={() => {
                      setBgColor(cp.bg);
                      setTextColor(cp.text);
                      setUseGradient(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      cursor: 'pointer',
                      color: 'var(--ink)',
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: cp.bg,
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                    <span>{cp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="c-field">
                <label className="c-field__label">Background Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: 'transparent',
                    }}
                  />
                  <input
                    type="text"
                    className="c-field__input"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div className="c-field">
                <label className="c-field__label">Text Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: 'transparent',
                    }}
                  />
                  <input
                    type="text"
                    className="c-field__input"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
                </div>
              </div>
            </div>

            {/* Gradient and Font Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={useGradient}
                  onChange={(e) => setUseGradient(e.target.checked)}
                />
                <span>Enable diagonal gradient background</span>
              </label>

              {useGradient && (
                <div className="c-field" style={{ marginLeft: 24 }}>
                  <label className="c-field__label">Gradient Secondary Color</label>
                  <input
                    type="color"
                    value={bgGradientColor}
                    onChange={(e) => setBgGradientColor(e.target.value)}
                    style={{
                      width: 36,
                      height: 36,
                      padding: 0,
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              )}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showWireframe}
                  onChange={(e) => setShowWireframe(e.target.checked)}
                />
                <span>Include wireframe guide diagonals & crosshair</span>
              </label>

              <div className="c-field" style={{ marginTop: 4 }}>
                <label className="c-field__label">Typography Style</label>
                <select
                  className="c-select"
                  value={fontFamily}
                  onChange={(e) =>
                    setFontFamily(e.target.value as 'sans' | 'mono' | 'serif')
                  }
                >
                  <option value="sans">Modern Sans-serif (Onest)</option>
                  <option value="mono">Technical Monospace (Geist Mono)</option>
                  <option value="serif">Editorial Serif (Georgia)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Image Preview & Downloads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            className="c-card"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                Live Canvas Preview
              </span>
              <span className="c-badge c-badge--brand">
                {width} × {height}
              </span>
            </div>

            {/* Canvas Viewer Container */}
            <div
              style={{
                width: '100%',
                minHeight: 220,
                maxHeight: 340,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                background: 'var(--bg-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                overflow: 'hidden',
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.03)',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              />
            </div>

            {/* Export format & Actions */}
            <div
              style={{
                width: '100%',
                marginTop: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div className="c-field">
                <label className="c-field__label">Download File Format</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['png', 'jpeg', 'webp', 'svg'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`c-btn ${format === fmt ? 'c-btn--secondary' : 'c-btn--ghost'} c-btn--sm`}
                      style={{
                        flex: 1,
                        textTransform: 'uppercase',
                        fontWeight: format === fmt ? 700 : 500,
                        border: format === fmt ? '1px solid var(--brand)' : '1px solid var(--border)',
                        color: format === fmt ? 'var(--brand)' : 'var(--ink-2)',
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Download Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleDownload}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={18} style={{ marginRight: 8 }} />
                Download {format.toUpperCase()} ({width}×{height})
              </Button>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCopyImage}
                  style={{ justifyContent: 'center' }}
                >
                  {copiedImage ? <Check size={15} style={{ marginRight: 6 }} /> : <Copy size={15} style={{ marginRight: 6 }} />}
                  Copy Image
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCopyDataUrl}
                  style={{ justifyContent: 'center' }}
                >
                  {copiedDataUrl ? <Check size={15} style={{ marginRight: 6 }} /> : <Copy size={15} style={{ marginRight: 6 }} />}
                  Copy Data URL
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
