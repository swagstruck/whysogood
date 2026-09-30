'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy, Check, Sliders, Hash, Palette, RefreshCw } from 'lucide-react';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  hexToHsl,
} from '@/lib/design/engines';

export type ConverterMode = 'hex-to-rgb' | 'rgb-to-hex' | 'hsl';

interface UnifiedColorConverterProps {
  initialMode?: ConverterMode;
}

const PRESET_COLORS = [
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Slate', hex: '#64748B' },
];

export default function UnifiedColorConverter({
  initialMode = 'hex-to-rgb',
}: UnifiedColorConverterProps) {
  const [mode, setMode] = useState<ConverterMode>(initialMode);
  const toast = useToast();

  // Internal color state
  const [hexInput, setHexInput] = useState('#6366F1');
  const [currentHex, setCurrentHex] = useState('#6366F1');
  const [r, setR] = useState(99);
  const [g, setG] = useState(102);
  const [b, setB] = useState(241);
  const [h, setH] = useState(239);
  const [s, setS] = useState(84);
  const [l, setL] = useState(67);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync state from HEX
  const applyHex = (newHex: string) => {
    setHexInput(newHex);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      setCurrentHex(newHex.toUpperCase());
      setR(rgb.r);
      setG(rgb.g);
      setB(rgb.b);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setH(hsl.h);
      setS(hsl.s);
      setL(hsl.l);
    }
  };

  // Sync state from RGB
  const applyRgb = (newR: number, newG: number, newB: number) => {
    const clampedR = Math.max(0, Math.min(255, Math.round(newR)));
    const clampedG = Math.max(0, Math.min(255, Math.round(newG)));
    const clampedB = Math.max(0, Math.min(255, Math.round(newB)));
    setR(clampedR);
    setG(clampedG);
    setB(clampedB);

    const calculatedHex = rgbToHex(clampedR, clampedG, clampedB);
    setCurrentHex(calculatedHex);
    setHexInput(calculatedHex);

    const hsl = rgbToHsl(clampedR, clampedG, clampedB);
    setH(hsl.h);
    setS(hsl.s);
    setL(hsl.l);
  };

  // Sync state from HSL
  const applyHsl = (newH: number, newS: number, newL: number) => {
    const clampedH = Math.max(0, Math.min(360, Math.round(newH)));
    const clampedS = Math.max(0, Math.min(100, Math.round(newS)));
    const clampedL = Math.max(0, Math.min(100, Math.round(newL)));
    setH(clampedH);
    setS(clampedS);
    setL(clampedL);

    const rgb = hslToRgb(clampedH, clampedS, clampedL);
    setR(rgb.r);
    setG(rgb.g);
    setB(rgb.b);

    const calculatedHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setCurrentHex(calculatedHex);
    setHexInput(calculatedHex);
  };

  const copy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Determine contrasting text color for preview card
  const isLight = (r * 299 + g * 587 + b * 114) / 1000 > 128;
  const rgbString = `rgb(${r}, ${g}, ${b})`;
  const hslString = `hsl(${h}, ${s}%, ${l}%)`;
  const cssBackground = `background-color: ${currentHex};`;

  return (
    <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: 4,
          background: 'var(--bg-2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => setMode('hex-to-rgb')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'hex-to-rgb' ? 600 : 500,
            background: mode === 'hex-to-rgb' ? 'var(--brand)' : 'transparent',
            color: mode === 'hex-to-rgb' ? '#ffffff' : 'var(--ink-2)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <Hash size={14} />
          HEX &rarr; RGB
        </button>
        <button
          onClick={() => setMode('rgb-to-hex')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'rgb-to-hex' ? 600 : 500,
            background: mode === 'rgb-to-hex' ? 'var(--brand)' : 'transparent',
            color: mode === 'rgb-to-hex' ? '#ffffff' : 'var(--ink-2)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <Sliders size={14} />
          RGB &rarr; HEX
        </button>
        <button
          onClick={() => setMode('hsl')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'hsl' ? 600 : 500,
            background: mode === 'hsl' ? 'var(--brand)' : 'transparent',
            color: mode === 'hsl' ? '#ffffff' : 'var(--ink-2)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <Palette size={14} />
          HSL Converter
        </button>
      </div>

      {/* Main Color Swatch & Live Preview Banner */}
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          background: currentHex,
          border: '1px solid var(--border)',
          padding: '24px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ color: isLight ? '#0f172a' : '#ffffff' }}>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {currentHex}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {rgbString} &bull; {hslString}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label
            title="Click to open system color picker"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)',
              color: isLight ? '#0f172a' : '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <span>Color Picker</span>
            <input
              type="color"
              value={currentHex}
              onChange={(e) => applyHex(e.target.value)}
              style={{
                width: 24,
                height: 24,
                padding: 0,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
          </label>
        </div>
      </div>

      {/* Preset Swatches */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Presets
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.hex}
              onClick={() => applyHex(preset.hex)}
              title={`${preset.name} (${preset.hex})`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-2)',
                border: currentHex === preset.hex ? '2px solid var(--brand)' : '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--ink)',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: preset.hex,
                  display: 'inline-block',
                }}
              />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Inputs based on mode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* HEX Input Area */}
        <div
          style={{
            padding: 16,
            background: mode === 'hex-to-rgb' ? 'var(--bg-2)' : 'transparent',
            borderRadius: 'var(--radius-md)',
            border: mode === 'hex-to-rgb' ? '1px solid var(--brand)' : '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              HEX Color Input
            </label>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Accepts #RGB, #RRGGBB</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => applyHex(e.target.value)}
              placeholder="#000000"
              className="input-base"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 14 }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => applyHex('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))}
              icon={<RefreshCw size={14} />}
            >
              Random
            </Button>
          </div>
        </div>

        {/* RGB Sliders and Inputs */}
        <div
          style={{
            padding: 16,
            background: mode === 'rgb-to-hex' ? 'var(--bg-2)' : 'transparent',
            borderRadius: 'var(--radius-md)',
            border: mode === 'rgb-to-hex' ? '1px solid var(--brand)' : '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
            RGB Channels (0 &ndash; 255)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {/* Red */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span style={{ color: '#ef4444' }}>Red (R)</span>
                <span>{r}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={r}
                onChange={(e) => applyRgb(Number(e.target.value), g, b)}
                style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
              />
              <input
                type="number"
                min="0"
                max="255"
                value={r}
                onChange={(e) => applyRgb(Number(e.target.value), g, b)}
                className="input-base"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Green */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span style={{ color: '#10b981' }}>Green (G)</span>
                <span>{g}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={g}
                onChange={(e) => applyRgb(r, Number(e.target.value), b)}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <input
                type="number"
                min="0"
                max="255"
                value={g}
                onChange={(e) => applyRgb(r, Number(e.target.value), b)}
                className="input-base"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Blue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span style={{ color: '#3b82f6' }}>Blue (B)</span>
                <span>{b}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={b}
                onChange={(e) => applyRgb(r, g, Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <input
                type="number"
                min="0"
                max="255"
                value={b}
                onChange={(e) => applyRgb(r, g, Number(e.target.value))}
                className="input-base"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* HSL Sliders and Inputs */}
        <div
          style={{
            padding: 16,
            background: mode === 'hsl' ? 'var(--bg-2)' : 'transparent',
            borderRadius: 'var(--radius-md)',
            border: mode === 'hsl' ? '1px solid var(--brand)' : '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
            HSL Controls (Hue, Saturation, Lightness)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {/* Hue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span>Hue (H)</span>
                <span>{h}&deg;</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={h}
                onChange={(e) => applyHsl(Number(e.target.value), s, l)}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: 'var(--brand)',
                }}
              />
              <input
                type="number"
                min="0"
                max="360"
                value={h}
                onChange={(e) => applyHsl(Number(e.target.value), s, l)}
                className="input-base"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Saturation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span>Saturation (S)</span>
                <span>{s}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={s}
                onChange={(e) => applyHsl(h, Number(e.target.value), l)}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand)' }}
              />
              <input
                type="number"
                min="0"
                max="100"
                value={s}
                onChange={(e) => applyHsl(h, Number(e.target.value), l)}
                className="input-base"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Lightness */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                <span>Lightness (L)</span>
                <span>{l}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={l}
                onChange={(e) => applyHsl(h, s, Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand)' }}
              />
              <input
                type="number"
                min="0"
                max="100"
                value={l}
                onChange={(e) => applyHsl(h, s, Number(e.target.value))}
                className="input-base"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Output / Conversion Results Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Conversion Outputs
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {/* HEX Card */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                HEX
              </div>
              <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                {currentHex}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(currentHex, 'hex')}
              icon={copiedKey === 'hex' ? <Check size={14} /> : <Copy size={14} />}
            >
              {copiedKey === 'hex' ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* RGB Card */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                RGB
              </div>
              <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                {rgbString}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(rgbString, 'rgb')}
              icon={copiedKey === 'rgb' ? <Check size={14} /> : <Copy size={14} />}
            >
              {copiedKey === 'rgb' ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* HSL Card */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                HSL
              </div>
              <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                {hslString}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(hslString, 'hsl')}
              icon={copiedKey === 'hsl' ? <Check size={14} /> : <Copy size={14} />}
            >
              {copiedKey === 'hsl' ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* CSS Background Snippet */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                CSS Snippet
              </div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                {cssBackground}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(cssBackground, 'css')}
              icon={copiedKey === 'css' ? <Check size={14} /> : <Copy size={14} />}
            >
              {copiedKey === 'css' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
