'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy } from 'lucide-react';
import { makeBorderRadiusCss } from '@/lib/design/engines';

export default function BorderRadiusTool() {
  const [tl, setTl] = useState(20);
  const [tr, setTr] = useState(20);
  const [br, setBr] = useState(20);
  const [bl, setBl] = useState(20);
  const [isPercent, setIsPercent] = useState(false);
  const toast = useToast();

  const radius = makeBorderRadiusCss(tl, tr, br, bl, isPercent);
  const cssText = `border-radius: ${radius};`;

  const copy = () => {
    copyToClipboard(cssText);
    toast.success('Copied CSS!');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface2)', borderRadius: 8 }}>
        <div style={{ width: 200, height: 200, background: 'var(--color-accent)', borderRadius: radius, transition: 'border-radius 0.2s' }} />
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={isPercent} onChange={e => setIsPercent(e.target.checked)} />
          Use % instead of px
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div><label style={{ fontSize: 12 }}>Top Left ({tl}{isPercent ? '%' : 'px'})</label><input type="range" min="0" max={isPercent ? 100 : 200} value={tl} onChange={e => setTl(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
        <div><label style={{ fontSize: 12 }}>Top Right ({tr}{isPercent ? '%' : 'px'})</label><input type="range" min="0" max={isPercent ? 100 : 200} value={tr} onChange={e => setTr(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
        <div><label style={{ fontSize: 12 }}>Bottom Left ({bl}{isPercent ? '%' : 'px'})</label><input type="range" min="0" max={isPercent ? 100 : 200} value={bl} onChange={e => setBl(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
        <div><label style={{ fontSize: 12 }}>Bottom Right ({br}{isPercent ? '%' : 'px'})</label><input type="range" min="0" max={isPercent ? 100 : 200} value={br} onChange={e => setBr(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
      </div>

      <div>
        <textarea readOnly value={cssText} className="input-base" style={{ width: '100%', height: 60, fontFamily: 'var(--font-mono)' }} />
        <Button style={{ marginTop: 12 }} onClick={copy} icon={<Copy size={16} />}>Copy CSS</Button>
      </div>
    </div>
  );
}