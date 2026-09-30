'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy } from 'lucide-react';
import { hexToRgb, hexToHsl } from '@/lib/design/engines';

export default function ColorPickerTool() {
  const [hex, setHex] = useState('#6366f1');
  const [history, setHistory] = useState<string[]>([]);
  const toast = useToast();

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHex(e.target.value);
  };

  const handleColorBlur = () => {
    if (!history.includes(hex)) {
      setHistory(prev => [hex, ...prev].slice(0, 12));
    }
  };

  const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
  const hsl = hexToHsl(hex) || { h: 0, s: 0, l: 0 };
  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const copy = (text: string) => {
    copyToClipboard(text);
    toast.success('Copied!');
  };

  return (
    <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <input
            type="color"
            value={hex}
            onChange={handleColorChange}
            onBlur={handleColorBlur}
            style={{ width: 128, height: 128, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 'var(--radius-md)' }}
          />
        </div>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={hex} className="input-base" style={{ flex: 1, height: 40, padding: '0 14px', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            <Button variant="secondary" onClick={() => copy(hex)} icon={<Copy size={16} />}>Copy</Button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={rgbStr} className="input-base" style={{ flex: 1, height: 40, padding: '0 14px', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            <Button variant="secondary" onClick={() => copy(rgbStr)} icon={<Copy size={16} />}>Copy</Button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={hslStr} className="input-base" style={{ flex: 1, height: 40, padding: '0 14px', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            <Button variant="secondary" onClick={() => copy(hslStr)} icon={<Copy size={16} />}>Copy</Button>
          </div>
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 8, color: 'var(--ink)' }}>Recent Colors</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {history.map((c, i) => (
            <div
              key={i}
              onClick={() => setHex(c)}
              style={{ width: 32, height: 32, borderRadius: 'var(--radius-xs)', background: c, cursor: 'pointer', border: '1px solid var(--border)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}