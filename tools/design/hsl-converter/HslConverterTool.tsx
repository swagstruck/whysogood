'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { hexToHsl, rgbToHsl, hslToHex, hslToRgb } from '@/lib/design/engines';

export default function HslConverterTool() {
  const [mode, setMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [hex, setHex] = useState('#6366f1');
  const [rgb, setRgb] = useState('99, 102, 241');
  const [hsl, setHsl] = useState('239, 84, 67');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const toast = useToast();

  const copy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  let outHex = '', outRgb = { r:0, g:0, b:0 }, outHsl = { h:0, s:0, l:0 };
  let isValid = true;

  try {
    if (mode === 'hex') {
      const parsedHsl = hexToHsl(hex);
      if (parsedHsl) { outHsl = parsedHsl; outHex = hex; outRgb = hslToRgb(parsedHsl.h, parsedHsl.s, parsedHsl.l); }
      else isValid = false;
    } else if (mode === 'rgb') {
      const parts = rgb.split(',').map(s => parseInt(s.trim()));
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        outHsl = rgbToHsl(parts[0], parts[1], parts[2]);
        outRgb = { r: parts[0], g: parts[1], b: parts[2] };
        outHex = hslToHex(outHsl.h, outHsl.s, outHsl.l);
      } else isValid = false;
    } else {
      const parts = hsl.split(',').map(s => parseInt(s.trim()));
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        outHsl = { h: parts[0], s: parts[1], l: parts[2] };
        outHex = hslToHex(outHsl.h, outHsl.s, outHsl.l);
        outRgb = hslToRgb(outHsl.h, outHsl.s, outHsl.l);
      } else isValid = false;
    }
  } catch(e) { isValid = false; }

  const rgbStr = `rgb(${outRgb.r}, ${outRgb.g}, ${outRgb.b})`;
  const hslStr = `hsl(${outHsl.h}, ${outHsl.s}%, ${outHsl.l}%)`;

  return (
    <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setMode('hex')}
          className="c-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'hex' ? 600 : 500,
            background: mode === 'hex' ? 'var(--brand)' : 'var(--bg-2)',
            color: mode === 'hex' ? '#ffffff' : 'var(--ink-2)',
            border: mode === 'hex' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          HEX &rarr; HSL
        </button>
        <button
          onClick={() => setMode('rgb')}
          className="c-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'rgb' ? 600 : 500,
            background: mode === 'rgb' ? 'var(--brand)' : 'var(--bg-2)',
            color: mode === 'rgb' ? '#ffffff' : 'var(--ink-2)',
            border: mode === 'rgb' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          RGB &rarr; HSL
        </button>
        <button
          onClick={() => setMode('hsl')}
          className="c-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'hsl' ? 600 : 500,
            background: mode === 'hsl' ? 'var(--brand)' : 'var(--bg-2)',
            color: mode === 'hsl' ? '#ffffff' : 'var(--ink-2)',
            border: mode === 'hsl' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          HSL &rarr; Both
        </button>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
          {mode === 'hex' ? 'Enter HEX Color' : mode === 'rgb' ? 'Enter RGB (R, G, B)' : 'Enter HSL (H, S, L)'}
        </label>
        {mode === 'hex' && <input value={hex} onChange={e => setHex(e.target.value)} className="input-base" style={{ width: '100%', fontFamily: 'var(--font-mono)' }} placeholder="#000000" />}
        {mode === 'rgb' && <input value={rgb} onChange={e => setRgb(e.target.value)} className="input-base" style={{ width: '100%', fontFamily: 'var(--font-mono)' }} placeholder="255, 255, 255" />}
        {mode === 'hsl' && <input value={hsl} onChange={e => setHsl(e.target.value)} className="input-base" style={{ width: '100%', fontFamily: 'var(--font-mono)' }} placeholder="360, 100, 50" />}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', background: isValid ? outHex : 'transparent', border: '1px solid var(--border)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {isValid ? outHex.toUpperCase() : 'Invalid Input'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
            {isValid ? 'Preview Swatch' : 'Please check input format'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>HEX</div>
            <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{isValid ? outHex : 'Invalid'}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => copy(outHex, 'hex')} icon={copiedKey === 'hex' ? <Check size={14} /> : <Copy size={14} />}>
            {copiedKey === 'hex' ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>RGB</div>
            <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{isValid ? rgbStr : 'Invalid'}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => copy(rgbStr, 'rgb')} icon={copiedKey === 'rgb' ? <Check size={14} /> : <Copy size={14} />}>
            {copiedKey === 'rgb' ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>HSL</div>
            <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{isValid ? hslStr : 'Invalid'}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => copy(hslStr, 'hsl')} icon={copiedKey === 'hsl' ? <Check size={14} /> : <Copy size={14} />}>
            {copiedKey === 'hsl' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </div>
  );
}