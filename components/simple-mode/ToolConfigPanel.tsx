'use client';
import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Lock, Unlock } from 'lucide-react';
import type { Tool } from '@/lib/types';
import type { RunnerOptions } from '@/lib/simpleMode/types';

interface ToolConfigPanelProps {
  tool: Tool;
  file: File;
  isProcessing: boolean;
  onExecute: (options: RunnerOptions) => void;
}

export function ToolConfigPanel({
  tool,
  file,
  isProcessing,
  onExecute,
}: ToolConfigPanelProps) {
  // State for different tool parameters
  const [quality, setQuality] = useState(82);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [angle, setAngle] = useState(90);
  const [direction, setDirection] = useState<'horizontal' | 'vertical' | 'both'>('horizontal');
  const [targetFormat, setTargetFormat] = useState('image/png');
  const [cropRatio, setCropRatio] = useState<'1:1' | '16:9' | '4:3'>('1:1');
  const [blurRadius, setBlurRadius] = useState(8);
  const [watermarkText, setWatermarkText] = useState('whysogood');
  const [watermarkOpacity, setWatermarkOpacity] = useState(35);
  const [dpi, setDpi] = useState(150);

  // Inspect image natural dimensions if applicable
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setOrigW(img.naturalWidth);
        setOrigH(img.naturalHeight);
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }, [file]);

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockRatio && origW > 0 && origH > 0 && val > 0) {
      setHeight(Math.round((val / origW) * origH));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockRatio && origW > 0 && origH > 0 && val > 0) {
      setWidth(Math.round((val / origH) * origW));
    }
  };

  const handlePreset = (pct: number) => {
    if (origW > 0 && origH > 0) {
      setWidth(Math.round(origW * (pct / 100)));
      setHeight(Math.round(origH * (pct / 100)));
    }
  };

  const handleRun = () => {
    const opts: RunnerOptions = {};
    const slug = tool.slug;

    if (slug === 'image-compressor' || slug === 'batch-image-compressor' || slug === 'image-quality') {
      opts.quality = quality;
    } else if (slug === 'image-resizer' || slug === 'batch-image-resizer') {
      opts.width = width;
      opts.height = height;
      opts.lockRatio = lockRatio;
      opts.format = targetFormat;
    } else if (slug === 'image-rotator' || slug === 'pdf-rotator') {
      opts.angle = angle;
    } else if (slug === 'image-flipper') {
      opts.direction = direction;
    } else if (slug === 'image-converter' || slug === 'batch-image-converter') {
      opts.targetFormat = targetFormat;
    } else if (slug === 'image-cropper') {
      opts.aspectRatio = cropRatio;
    } else if (slug === 'image-blur') {
      opts.radius = blurRadius;
    } else if (slug === 'image-watermark' || slug === 'pdf-watermark') {
      opts.text = watermarkText;
      opts.opacity = watermarkOpacity / 100;
    } else if (slug === 'pdf-to-jpg' || slug === 'pdf-to-png' || slug === 'image-dpi') {
      opts.dpi = dpi;
    }

    onExecute(opts);
  };

  return (
    <div
      className="c-card"
      style={{
        marginTop: 20,
        padding: '20px 24px',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '0 0 2px' }}>
            Tool Controls: {tool.name}
          </h4>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            Configure options below and apply them to &ldquo;{file.name}&rdquo;.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={isProcessing}
          className="c-btn c-btn--primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 700,
            padding: '0 20px',
            height: 40,
            boxShadow: '0 2px 8px rgba(96, 96, 232, 0.25)',
          }}
        >
          {isProcessing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Processing…</span>
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" />
              <span>Run {tool.name}</span>
            </>
          )}
        </button>
      </div>

      {/* ── Inline Controls by Tool Type ────────────────────────────── */}

      {/* Image Compressor / Quality Changer */}
      {(tool.slug === 'image-compressor' || tool.slug === 'batch-image-compressor' || tool.slug === 'image-quality') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink)' }}>
            <span>Target Quality: <strong>{quality}%</strong></span>
            <span style={{ color: 'var(--ink-2)' }}>Higher quality = larger file</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={quality}
            onChange={e => setQuality(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Image Resizer / Batch Resizer */}
      {(tool.slug === 'image-resizer' || tool.slug === 'batch-image-resizer') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--ink-2)' }}>Width:</label>
              <input
                type="number"
                value={width}
                onChange={e => handleWidthChange(Number(e.target.value))}
                style={{
                  width: 90,
                  height: 34,
                  padding: '0 8px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  fontSize: 13,
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>px</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--ink-2)' }}>Height:</label>
              <input
                type="number"
                value={height}
                onChange={e => handleHeightChange(Number(e.target.value))}
                style={{
                  width: 90,
                  height: 34,
                  padding: '0 8px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  fontSize: 13,
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>px</span>
            </div>

            <button
              onClick={() => setLockRatio(!lockRatio)}
              className="c-btn c-btn--secondary c-btn--sm"
              style={{ display: 'flex', alignItems: 'center', gap: 4, height: 34, fontSize: 12 }}
            >
              {lockRatio ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{lockRatio ? 'Ratio Locked' : 'Unlocked'}</span>
            </button>
          </div>

          {/* Quick presets */}
          {origW > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Presets:</span>
              {[25, 50, 75, 100, 200].map(pct => (
                <button
                  key={pct}
                  onClick={() => handlePreset(pct)}
                  className="c-btn c-btn--secondary c-btn--sm"
                  style={{ padding: '2px 8px', height: 26, fontSize: 11 }}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rotator (Image or PDF) */}
      {(tool.slug === 'image-rotator' || tool.slug === 'pdf-rotator') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Rotation Angle:</span>
          {[90, 180, 270].map(deg => (
            <button
              key={deg}
              onClick={() => setAngle(deg)}
              className={`c-btn c-btn--sm ${angle === deg ? 'c-btn--primary' : 'c-btn--secondary'}`}
              style={{ height: 32, fontSize: 12 }}
            >
              {deg}° Clockwise
            </button>
          ))}
        </div>
      )}

      {/* Flipper */}
      {tool.slug === 'image-flipper' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Flip Direction:</span>
          {(['horizontal', 'vertical', 'both'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`c-btn c-btn--sm ${direction === dir ? 'c-btn--primary' : 'c-btn--secondary'}`}
              style={{ height: 32, fontSize: 12, textTransform: 'capitalize' }}
            >
              {dir}
            </button>
          ))}
        </div>
      )}

      {/* Cropper */}
      {tool.slug === 'image-cropper' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Aspect Ratio:</span>
          {(['1:1', '16:9', '4:3'] as const).map(r => (
            <button
              key={r}
              onClick={() => setCropRatio(r)}
              className={`c-btn c-btn--sm ${cropRatio === r ? 'c-btn--primary' : 'c-btn--secondary'}`}
              style={{ height: 32, fontSize: 12 }}
            >
              {r} {r === '1:1' ? '(Square)' : r === '16:9' ? '(Widescreen)' : '(Standard)'}
            </button>
          ))}
        </div>
      )}

      {/* Converter */}
      {(tool.slug === 'image-converter' || tool.slug === 'batch-image-converter') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Target Format:</span>
          {[
            { label: 'PNG (Lossless)', val: 'image/png' },
            { label: 'JPEG (Compact)', val: 'image/jpeg' },
            { label: 'WebP (Modern)', val: 'image/webp' },
          ].map(f => (
            <button
              key={f.val}
              onClick={() => setTargetFormat(f.val)}
              className={`c-btn c-btn--sm ${targetFormat === f.val ? 'c-btn--primary' : 'c-btn--secondary'}`}
              style={{ height: 32, fontSize: 12 }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Image DPI */}
      {tool.slug === 'image-dpi' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Target DPI:</span>
          {[72, 96, 150, 300, 600].map(val => (
            <button
              key={val}
              onClick={() => setDpi(val)}
              className={`c-btn c-btn--sm ${dpi === val ? 'c-btn--primary' : 'c-btn--secondary'}`}
              style={{ height: 32, fontSize: 12 }}
            >
              {val} DPI {val === 300 ? '(Print)' : val === 72 ? '(Screen)' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Blur */}
      {tool.slug === 'image-blur' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink)' }}>
            <span>Blur Strength: <strong>{blurRadius}px</strong></span>
          </div>
          <input
            type="range"
            min="2"
            max="30"
            value={blurRadius}
            onChange={e => setBlurRadius(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Watermark (Image or PDF) */}
      {(tool.slug === 'image-watermark' || tool.slug === 'pdf-watermark') && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-2)' }}>Watermark Text:</label>
            <input
              type="text"
              value={watermarkText}
              onChange={e => setWatermarkText(e.target.value)}
              style={{
                height: 34,
                padding: '0 10px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: 13,
                width: 180,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-2)' }}>Opacity ({watermarkOpacity}%):</label>
            <input
              type="range"
              min="10"
              max="100"
              value={watermarkOpacity}
              onChange={e => setWatermarkOpacity(Number(e.target.value))}
              style={{ width: 120, accentColor: 'var(--brand)', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* PDF to Image */}
      {(tool.slug === 'pdf-to-jpg' || tool.slug === 'pdf-to-png') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>Rendering Resolution:</span>
          {[
            { label: 'Standard (72 DPI)', val: 72 },
            { label: 'High (150 DPI)', val: 150 },
            { label: 'Print (300 DPI)', val: 300 },
          ].map(d => (
            <button
              key={d.val}
              onClick={() => setDpi(d.val)}
              className={`c-btn c-btn--sm ${dpi === d.val ? 'c-btn--primary' : 'c-btn--secondary'}`}
              style={{ height: 32, fontSize: 12 }}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Background Remover */}
      {tool.slug === 'background-remover' && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Removes background from &ldquo;{file.name}&rdquo; using on-device neural network processing. Yields a transparent PNG.
        </div>
      )}

      {/* Data / Developer / Text info */}
      {tool.slug === 'csv-to-json' && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Parses CSV rows and columns into standard JSON format.
        </div>
      )}

      {tool.slug === 'json-formatter' && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Formats and indents JSON structure with 2-space indentation.
        </div>
      )}

      {tool.slug === 'word-counter' && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Generates a comprehensive word, character, and reading-time report.
        </div>
      )}

      {tool.slug === 'base64-encoder' && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Encodes &ldquo;{file.name}&rdquo; into a Base64 text string.
        </div>
      )}
    </div>
  );
}
