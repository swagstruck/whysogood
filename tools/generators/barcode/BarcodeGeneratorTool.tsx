'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { downloadBlob, copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  Download,
  Copy,
  Check,
  Barcode,
  Palette,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';

type BarcodeFormat = 'code128' | 'ean13' | 'code39';

// ── Code 128 B Encoder ──────────────────────────────────────────────
function encodeCode128(text: string): { binary: string; display: string } | null {
  if (!text) return null;
  const START_B = 104;
  const STOP = 106;
  const charset =
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7F";
  const patterns = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
    '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
    '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
    '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
    '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
    '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
    '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
    '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
    '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
    '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
    '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
    '211214', '211232', '2331112',
  ];

  let sum = START_B;
  const chars: number[] = [START_B];

  for (let i = 0; i < text.length; i++) {
    const val = charset.indexOf(text[i]);
    if (val === -1) return null;
    chars.push(val);
    sum += val * (i + 1);
  }

  chars.push(sum % 103);
  chars.push(STOP);

  let binary = '';
  for (const c of chars) {
    const pat = c === STOP ? patterns[STOP] : patterns[c];
    for (let i = 0; i < pat.length; i++) {
      const width = parseInt(pat[i], 10);
      const color = i % 2 === 0 ? '1' : '0';
      binary += color.repeat(width);
    }
  }
  return { binary, display: text };
}

// ── Code 39 Encoder ─────────────────────────────────────────────────
function encodeCode39(text: string): { binary: string; display: string } | null {
  const upper = text.toUpperCase().trim();
  if (!upper) return null;
  const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
  for (let i = 0; i < upper.length; i++) {
    if (!validChars.includes(upper[i])) return null;
  }

  // 1 = wide bar, 0 = narrow bar, 1/0 for spaces
  const map: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100',
  };

  const raw = `*${upper}*`;
  let binary = '';
  for (let i = 0; i < raw.length; i++) {
    const pat = map[raw[i]];
    if (!pat) return null;
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pat[j] === '1';
      const width = isWide ? 3 : 1;
      binary += (isBar ? '1' : '0').repeat(width);
    }
    // Inter-character narrow space
    binary += '0';
  }
  return { binary, display: upper };
}

// ── EAN-13 Encoder ──────────────────────────────────────────────────
function encodeEan13(text: string): { binary: string; display: string } | null {
  const digitsOnly = text.replace(/[^0-9]/g, '');
  if (digitsOnly.length !== 12 && digitsOnly.length !== 13) return null;

  const d = digitsOnly.slice(0, 12).split('').map(Number);
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += d[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const full13 = [...d, checkDigit];

  // EAN-13 Encoding tables
  const L = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011',
  ];
  const G = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111',
  ];
  const R = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100',
  ];
  const FIRST_PATTERNS = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
  ];

  const first = full13[0];
  const structure = FIRST_PATTERNS[first];
  let binary = '101'; // Left guard

  for (let i = 0; i < 6; i++) {
    const digit = full13[i + 1];
    binary += structure[i] === 'L' ? L[digit] : G[digit];
  }

  binary += '01010'; // Center guard

  for (let i = 0; i < 6; i++) {
    const digit = full13[i + 7];
    binary += R[digit];
  }

  binary += '101'; // Right guard

  return { binary, display: full13.join('') };
}

export default function BarcodeGeneratorTool() {
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [format, setFormat] = useState<BarcodeFormat>('code128');
  const [content, setContent] = useState('CODE128-DEMO');
  const [barWidth, setBarWidth] = useState<number>(2);
  const [barHeight, setBarHeight] = useState<number>(100);
  const [showLabel, setShowLabel] = useState<boolean>(true);
  const [fgColor, setFgColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);

  // Quick Preset Samples
  const handleSelectFormat = (newFormat: BarcodeFormat) => {
    setFormat(newFormat);
    if (newFormat === 'code128') setContent('ITEM-84729');
    if (newFormat === 'ean13') setContent('5901234123457');
    if (newFormat === 'code39') setContent('INVENTORY-99');
  };

  // Compute binary bar pattern
  const encoded = useMemo(() => {
    if (!content.trim()) return null;
    switch (format) {
      case 'code128':
        return encodeCode128(content.trim());
      case 'code39':
        return encodeCode39(content.trim());
      case 'ean13':
        return encodeEan13(content.trim());
      default:
        return null;
    }
  }, [format, content]);

  // Render on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!encoded) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const { binary, display } = encoded;
    const quietZone = 24;
    const textHeight = showLabel ? 28 : 0;
    const totalWidth = binary.length * barWidth + quietZone * 2;
    const totalHeight = barHeight + textHeight + quietZone * 2;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Background fill
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Bars
    ctx.fillStyle = fgColor;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        ctx.fillRect(quietZone + i * barWidth, quietZone, barWidth, barHeight);
      }
    }

    // Text Label below
    if (showLabel) {
      ctx.fillStyle = fgColor;
      ctx.font = '600 14px var(--font-mono, monospace)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(display, totalWidth / 2, quietZone + barHeight + 8);
    }
  }, [encoded, barWidth, barHeight, showLabel, fgColor, bgColor]);

  // Generate SVG string
  const svgMarkup = useMemo(() => {
    if (!encoded) return '';
    const { binary, display } = encoded;
    const quietZone = 24;
    const textHeight = showLabel ? 28 : 0;
    const totalWidth = binary.length * barWidth + quietZone * 2;
    const totalHeight = barHeight + textHeight + quietZone * 2;

    let barsXml = '';
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        barsXml += `<rect x="${quietZone + i * barWidth}" y="${quietZone}" width="${barWidth}" height="${barHeight}" fill="${fgColor}"/>\n`;
      }
    }

    const labelXml = showLabel
      ? `<text x="${totalWidth / 2}" y="${quietZone + barHeight + 18}" text-anchor="middle" font-family="monospace" font-size="14" font-weight="600" fill="${fgColor}">${display}</text>`
      : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  ${barsXml}
  ${labelXml}
</svg>`;
  }, [encoded, barWidth, barHeight, showLabel, fgColor, bgColor]);

  // Download actions
  const handleDownloadPng = () => {
    if (!canvasRef.current || !encoded) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `barcode-${format}.png`);
        toast.success('Downloaded barcode PNG');
      }
    }, 'image/png');
  };

  const handleDownloadSvg = () => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    downloadBlob(blob, `barcode-${format}.svg`);
    toast.success('Downloaded vector barcode SVG');
  };

  const handleCopyImage = () => {
    if (!canvasRef.current || !encoded) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopiedImage(true);
          toast.success('Barcode copied to clipboard');
          setTimeout(() => setCopiedImage(false), 2000);
        } else {
          toast.error('Image clipboard copy not supported on this browser');
        }
      } catch {
        toast.error('Failed to copy image');
      }
    }, 'image/png');
  };

  const handleCopySvg = async () => {
    if (!svgMarkup) return;
    try {
      await copyToClipboard(svgMarkup);
      setCopiedSvg(true);
      toast.success('Vector SVG markup copied to clipboard');
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch {
      toast.error('Failed to copy SVG');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Format Switcher */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {[
          { id: 'code128' as const, label: 'Code 128 (General Purpose)' },
          { id: 'ean13' as const, label: 'EAN-13 (Retail / UPC)' },
          { id: 'code39' as const, label: 'Code 39 (Alphanumeric)' },
        ].map((f) => {
          const active = format === f.id;
          return (
            <button
              key={f.id}
              onClick={() => handleSelectFormat(f.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--brand)' : 'transparent',
                color: active ? '#ffffff' : 'var(--ink-2)',
                border: 'none',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Barcode size={15} />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Controls vs Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Input and Styling */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Data Card */}
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
              <Barcode size={16} color="var(--brand-500)" />
              <span>Barcode Data</span>
            </h3>

            <div className="c-field">
              <label className="c-field__label">Content to Encode</label>
              <input
                type="text"
                className="c-field__input"
                placeholder={
                  format === 'ean13'
                    ? 'Enter 12 or 13 digits (e.g. 5901234123457)'
                    : 'Enter text, numbers, or symbols'
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <span className="c-field__hint">
                {format === 'ean13' && 'Accepts 12 digits (check digit will be computed) or 13 digits.'}
                {format === 'code39' && 'Accepts uppercase A-Z, 0-9, and standard symbols (-.$/+%).'}
                {format === 'code128' && 'Accepts full ASCII alphanumeric character set.'}
              </span>
            </div>

            {/* Validation warning if invalid */}
            {!encoded && content.trim().length > 0 && (
              <div
                className="c-alert c-alert--warn"
                style={{ marginTop: 12, padding: 12, fontSize: 13 }}
              >
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                  {format === 'ean13'
                    ? 'EAN-13 requires exactly 12 or 13 numeric digits.'
                    : 'The input contains characters not supported by this format.'}
                </span>
              </div>
            )}
          </div>

          {/* Bar Dimensions & Visuals Card */}
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
              <Sliders size={16} color="var(--brand-500)" />
              <span>Bar Geometry & Sizing</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Bar Width Slider */}
              <div className="c-field">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <label className="c-field__label" style={{ margin: 0 }}>
                    Module Width
                  </label>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--brand)',
                      fontWeight: 600,
                    }}
                  >
                    {barWidth} px
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={barWidth}
                  onChange={(e) => setBarWidth(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
              </div>

              {/* Bar Height Slider */}
              <div className="c-field">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <label className="c-field__label" style={{ margin: 0 }}>
                    Bar Height
                  </label>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--brand)',
                      fontWeight: 600,
                    }}
                  >
                    {barHeight} px
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="10"
                  value={barHeight}
                  onChange={(e) => setBarHeight(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
              </div>

              {/* Show Text Label Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showLabel}
                  onChange={(e) => setShowLabel(e.target.checked)}
                />
                <span>Include human-readable text label underneath</span>
              </label>

              {/* Colors */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginTop: 4,
                }}
              >
                <div className="c-field">
                  <label className="c-field__label">Bar Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
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
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

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
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Barcode Preview & Downloads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            className="c-card"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
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
                Barcode Preview
              </span>
              <span className="c-badge c-badge--neutral" style={{ textTransform: 'uppercase' }}>
                {format}
              </span>
            </div>

            {/* Canvas Viewer Container */}
            <div
              style={{
                width: '100%',
                minHeight: 180,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                background: 'var(--bg-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                overflowX: 'auto',
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.03)',
              }}
            >
              {encoded ? (
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    color: 'var(--ink-3)',
                    padding: 24,
                  }}
                >
                  <Barcode size={48} strokeWidth={1.5} />
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Enter valid barcode characters to generate your barcode
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {encoded && (
              <div
                style={{
                  width: '100%',
                  marginTop: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDownloadPng}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Download size={18} style={{ marginRight: 8 }} />
                  Download PNG
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
                    onClick={handleDownloadSvg}
                    style={{ justifyContent: 'center' }}
                  >
                    <Download size={15} style={{ marginRight: 6 }} />
                    Vector SVG
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleCopyImage}
                    style={{ justifyContent: 'center' }}
                  >
                    {copiedImage ? (
                      <Check size={15} style={{ marginRight: 6 }} />
                    ) : (
                      <Copy size={15} style={{ marginRight: 6 }} />
                    )}
                    Copy Image
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopySvg}
                  style={{ justifyContent: 'center', color: 'var(--ink-2)' }}
                >
                  {copiedSvg ? (
                    <Check size={14} style={{ marginRight: 6 }} />
                  ) : (
                    <Copy size={14} style={{ marginRight: 6 }} />
                  )}
                  Copy SVG Markup
                </Button>
              </div>
            )}
          </div>

          {/* Educational info */}
          <div
            style={{
              padding: 16,
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={14} color="var(--brand)" />
              <span>Barcode Standards Summary</span>
            </div>
            <p style={{ margin: '0 0 6px' }}>
              <strong>Code 128:</strong> High-density barcode used in shipping, logistics, and inventory management.
            </p>
            <p style={{ margin: 0 }}>
              <strong>EAN-13:</strong> Universal product code standard used for retail checkout scanning worldwide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
