'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy } from 'lucide-react';
import { makeGlassmorphismCss } from '@/lib/design/engines';

export default function GlassmorphismTool() {
  const [blur, setBlur] = useState(10);
  const [opacity, setOpacity] = useState(0.5);
  const [borderOpacity, setBorderOpacity] = useState(0.3);
  const [bgColor, setBgColor] = useState('#ffffff');
  const toast = useToast();

  const css = makeGlassmorphismCss(blur, opacity, borderOpacity, bgColor);
  const cssText = `background: ${css.background};
backdrop-filter: ${css.backdrop};
-webkit-backdrop-filter: ${css.backdrop};
border: ${css.border};`;

  const copy = () => {
    copyToClipboard(cssText);
    toast.success('Copied CSS!');
  };

  return (
    <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: '100%', height: 300, background: 'linear-gradient(45deg, #ec4899, #6366f1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 250, height: 150, borderRadius: 'var(--radius-lg)', background: css.background, backdropFilter: css.backdrop, WebkitBackdropFilter: css.backdrop, border: css.border, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 'bold' }}>Glass</div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Blur ({blur}px)</label><input type="range" min="0" max="40" value={blur} onChange={e => setBlur(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand)' }} /></div>
        <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Background Opacity ({opacity})</label><input type="range" min="0" max="1" step="0.05" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand)' }} /></div>
        <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Border Opacity ({borderOpacity})</label><input type="range" min="0" max="1" step="0.05" value={borderOpacity} onChange={e => setBorderOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand)' }} /></div>
        <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Background Color</label><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: 44, height: 44, padding: 0, display: 'block', borderRadius: 'var(--radius-sm)' }} /></div>
      </div>

      <div>
        <textarea
          readOnly
          value={cssText}
          className="input-base"
          style={{
            width: '100%',
            height: 120,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            padding: '12px 14px',
            boxSizing: 'border-box',
            lineHeight: 1.6,
            borderRadius: 'var(--radius-md)',
          }}
        />
        <Button style={{ marginTop: 12 }} onClick={copy} icon={<Copy size={16} />}>Copy CSS</Button>
      </div>
    </div>
  );
}