'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy, Plus, Trash } from 'lucide-react';
import { makeCssShadow } from '@/lib/design/engines';

export default function CssShadowTool() {
  const [layers, setLayers] = useState([{ x: 0, y: 4, blur: 12, spread: 0, color: '#000000', inset: false, opacity: 0.1 }]);
  const toast = useToast();

  const addLayer = () => {
    if (layers.length >= 4) return;
    setLayers([...layers, { x: 0, y: 4, blur: 12, spread: 0, color: '#000000', inset: false, opacity: 0.1 }]);
  };
  const removeLayer = (i: number) => {
    if (layers.length <= 1) return;
    const nl = [...layers]; nl.splice(i, 1); setLayers(nl);
  };
  const updateLayer = (i: number, field: string, val: any) => {
    const nl = [...layers]; nl[i] = { ...nl[i], [field]: val }; setLayers(nl);
  };

  const css = layers.map(l => makeCssShadow(l.x, l.y, l.blur, l.spread, l.color, l.inset, l.opacity)).join(', ');

  const copy = () => {
    copyToClipboard(`box-shadow: ${css};`);
    toast.success('Copied CSS!');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface2)', borderRadius: 8 }}>
        <div style={{ width: 100, height: 100, background: 'var(--color-surface3)', borderRadius: 8, boxShadow: css }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {layers.map((l, i) => (
          <div key={i} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Layer {i + 1}</span>
              <Button variant="danger" size="sm" onClick={() => removeLayer(i)} disabled={layers.length <= 1} icon={<Trash size={14} />}> </Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 12 }}>X Offset ({l.x}px)</label><input type="range" min="-50" max="50" value={l.x} onChange={e => updateLayer(i, 'x', parseInt(e.target.value))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: 12 }}>Y Offset ({l.y}px)</label><input type="range" min="-50" max="50" value={l.y} onChange={e => updateLayer(i, 'y', parseInt(e.target.value))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: 12 }}>Blur ({l.blur}px)</label><input type="range" min="0" max="100" value={l.blur} onChange={e => updateLayer(i, 'blur', parseInt(e.target.value))} style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: 12 }}>Spread ({l.spread}px)</label><input type="range" min="-50" max="50" value={l.spread} onChange={e => updateLayer(i, 'spread', parseInt(e.target.value))} style={{ width: '100%' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="color" value={l.color} onChange={e => updateLayer(i, 'color', e.target.value)} style={{ width: 44, height: 44, padding: 0 }} />
              <div style={{ flex: 1 }}><label style={{ fontSize: 12 }}>Opacity ({l.opacity})</label><input type="range" min="0" max="1" step="0.05" value={l.opacity} onChange={e => updateLayer(i, 'opacity', parseFloat(e.target.value))} style={{ width: '100%' }} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><input type="checkbox" checked={l.inset} onChange={e => updateLayer(i, 'inset', e.target.checked)} /> Inset</label>
            </div>
          </div>
        ))}
        {layers.length < 4 && <Button variant="secondary" onClick={addLayer} icon={<Plus size={16} />}>Add Layer</Button>}
      </div>

      <div>
        <textarea
          readOnly
          value={`box-shadow: ${css};`}
          className="input-base"
          style={{
            width: '100%',
            height: 80,
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