'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy } from 'lucide-react';
import { hexToRgb, hexToHsl } from '@/lib/design/engines';

export default function HexToRgbTool() {
  const [hex, setHex] = useState('#6366f1');
  const toast = useToast();

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHex(val);
  };

  const rgb = hexToRgb(hex);
  const hsl = hexToHsl(hex);

  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : 'Invalid';
  const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : 'Invalid';

  const copy = (text: string) => {
    copyToClipboard(text);
    toast.success('Copied!');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <input 
          value={hex} 
          onChange={handleHexChange} 
          className="input-base" 
          placeholder="#000000"
          style={{ flex: 1 }}
        />
      </div>
      <div style={{ width: 128, height: 128, borderRadius: 8, background: rgb ? hex : 'transparent', border: '1px solid var(--color-border)' }} />
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>RGB</div>
            <div style={{ fontSize: 16 }}>{rgbStr}</div>
          </div>
          <Button variant="secondary" onClick={() => copy(rgbStr)} icon={<Copy size={16} />}>Copy</Button>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>HSL</div>
            <div style={{ fontSize: 16 }}>{hslStr}</div>
          </div>
          <Button variant="secondary" onClick={() => copy(hslStr)} icon={<Copy size={16} />}>Copy</Button>
        </div>
      </div>
    </div>
  );
}