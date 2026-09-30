'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy } from 'lucide-react';
import { hexToHsl, rgbToHsl, hslToHex, hslToRgb } from '@/lib/design/engines';

export default function HslConverterTool() {
  const [mode, setMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [hex, setHex] = useState('#6366f1');
  const [rgb, setRgb] = useState('99, 102, 241');
  const [hsl, setHsl] = useState('239, 84, 67');
  const toast = useToast();

  const copy = (text: string) => {
    copyToClipboard(text);
    toast.success('Copied!');
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
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant={mode === 'hex' ? 'primary' : 'secondary'} onClick={() => setMode('hex')}>HEX &rarr; HSL</Button>
        <Button variant={mode === 'rgb' ? 'primary' : 'secondary'} onClick={() => setMode('rgb')}>RGB &rarr; HSL</Button>
        <Button variant={mode === 'hsl' ? 'primary' : 'secondary'} onClick={() => setMode('hsl')}>HSL &rarr; Both</Button>
      </div>

      <div>
        {mode === 'hex' && <input value={hex} onChange={e => setHex(e.target.value)} className="input-base" style={{ width: '100%' }} placeholder="#000000" />}
        {mode === 'rgb' && <input value={rgb} onChange={e => setRgb(e.target.value)} className="input-base" style={{ width: '100%' }} placeholder="255, 255, 255" />}
        {mode === 'hsl' && <input value={hsl} onChange={e => setHsl(e.target.value)} className="input-base" style={{ width: '100%' }} placeholder="360, 100, 50" />}
      </div>

      <div style={{ width: 128, height: 128, borderRadius: 8, background: isValid ? outHex : 'transparent', border: '1px solid var(--color-border)' }} />

      <div style={{ display: 'grid', gap: 16 }}>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>HEX</div><div style={{ fontSize: 16 }}>{isValid ? outHex : 'Invalid'}</div></div>
          <Button variant="secondary" onClick={() => copy(outHex)}>Copy</Button>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>RGB</div><div style={{ fontSize: 16 }}>{isValid ? rgbStr : 'Invalid'}</div></div>
          <Button variant="secondary" onClick={() => copy(rgbStr)}>Copy</Button>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>HSL</div><div style={{ fontSize: 16 }}>{isValid ? hslStr : 'Invalid'}</div></div>
          <Button variant="secondary" onClick={() => copy(hslStr)}>Copy</Button>
        </div>
      </div>
    </div>
  );
}