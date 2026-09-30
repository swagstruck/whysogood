'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy } from 'lucide-react';
import { rgbToHex, rgbToHsl } from '@/lib/design/engines';

export default function RgbToHexTool() {
  const [r, setR] = useState('99');
  const [g, setG] = useState('102');
  const [b, setB] = useState('241');
  const toast = useToast();

  const rNum = parseInt(r) || 0;
  const gNum = parseInt(g) || 0;
  const bNum = parseInt(b) || 0;

  const hex = rgbToHex(rNum, gNum, bNum);
  const hsl = rgbToHsl(rNum, gNum, bNum);

  const rgbStr = `rgb(${rNum}, ${gNum}, ${bNum})`;
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const copy = (text: string) => {
    copyToClipboard(text);
    toast.success('Copied!');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 12 }}>R</label>
          <input type="range" min="0" max="255" value={r} onChange={e => setR(e.target.value)} style={{ width: '100%' }} />
          <input type="number" value={r} onChange={e => setR(e.target.value)} className="input-base" style={{ width: '100%', marginTop: 8 }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 12 }}>G</label>
          <input type="range" min="0" max="255" value={g} onChange={e => setG(e.target.value)} style={{ width: '100%' }} />
          <input type="number" value={g} onChange={e => setG(e.target.value)} className="input-base" style={{ width: '100%', marginTop: 8 }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-muted)', fontSize: 12 }}>B</label>
          <input type="range" min="0" max="255" value={b} onChange={e => setB(e.target.value)} style={{ width: '100%' }} />
          <input type="number" value={b} onChange={e => setB(e.target.value)} className="input-base" style={{ width: '100%', marginTop: 8 }} />
        </div>
      </div>
      
      <div style={{ width: 128, height: 128, borderRadius: 8, background: hex, border: '1px solid var(--color-border)' }} />

      <div style={{ display: 'grid', gap: 16 }}>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>HEX</div>
            <div style={{ fontSize: 16 }}>{hex}</div>
          </div>
          <Button variant="secondary" onClick={() => copy(hex)} icon={<Copy size={16} />}>Copy</Button>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>CSS RGB</div>
            <div style={{ fontSize: 16 }}>{rgbStr}</div>
          </div>
          <Button variant="secondary" onClick={() => copy(rgbStr)} icon={<Copy size={16} />}>Copy</Button>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>CSS HSL</div>
            <div style={{ fontSize: 16 }}>{hslStr}</div>
          </div>
          <Button variant="secondary" onClick={() => copy(hslStr)} icon={<Copy size={16} />}>Copy</Button>
        </div>
      </div>
    </div>
  );
}