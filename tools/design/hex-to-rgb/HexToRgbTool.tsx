'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { hexToRgb, hexToHsl } from '@/lib/design/engines';

export default function HexToRgbTool() {
  const [hex, setHex] = useState('#6366f1');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const toast = useToast();

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHex(e.target.value);
  };

  const rgb = hexToRgb(hex);
  const hsl = hexToHsl(hex);

  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : 'Invalid';
  const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : 'Invalid';

  const copy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
          HEX Color Code
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input 
            value={hex} 
            onChange={handleHexChange} 
            className="input-base" 
            placeholder="#000000"
            style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
          />
          <input
            type="color"
            value={rgb ? hex : '#6366f1'}
            onChange={(e) => setHex(e.target.value)}
            style={{ width: 42, height: 42, padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', background: rgb ? hex : 'transparent', border: '1px solid var(--border)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {rgb ? hex.toUpperCase() : 'Invalid HEX'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
            {rgb ? 'Valid HEX format' : 'Please enter a valid 3- or 6-digit hex code with #' }
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>RGB Output</div>
            <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{rgbStr}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => copy(rgbStr, 'rgb')} icon={copiedKey === 'rgb' ? <Check size={14} /> : <Copy size={14} />}>
            {copiedKey === 'rgb' ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' }}>HSL Output</div>
            <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{hslStr}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => copy(hslStr, 'hsl')} icon={copiedKey === 'hsl' ? <Check size={14} /> : <Copy size={14} />}>
            {copiedKey === 'hsl' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </div>
  );
}