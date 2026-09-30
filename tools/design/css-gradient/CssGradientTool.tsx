'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { Copy, Plus, Trash } from 'lucide-react';
import { makeCssGradient } from '@/lib/design/engines';

export default function CssGradientTool() {
  const [type, setType] = useState<'linear' | 'radial'>('linear');
  const [angle, setAngle] = useState(90);
  const [stops, setStops] = useState([{ c: '#6366f1', p: 0 }, { c: '#ec4899', p: 100 }]);
  const toast = useToast();

  const addStop = () => {
    if (stops.length >= 5) return;
    setStops([...stops, { c: '#000000', p: 50 }]);
  };
  const removeStop = (i: number) => {
    if (stops.length <= 2) return;
    const newStops = [...stops];
    newStops.splice(i, 1);
    setStops(newStops);
  };
  const updateStop = (i: number, field: 'c' | 'p', val: string | number) => {
    const newStops = [...stops];
    newStops[i] = { ...newStops[i], [field]: val };
    setStops(newStops);
  };

  const css = makeCssGradient(type, angle, stops.map(s => s.c), stops.map(s => s.p));

  const copy = () => {
    copyToClipboard(`background: ${css};`);
    toast.success('Copied CSS!');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: '100%', height: 200, background: css, borderRadius: 8, border: '1px solid var(--color-border)' }} />

      <div style={{ display: 'flex', gap: 16 }}>
        <select value={type} onChange={e => setType(e.target.value as any)} className="input-base" style={{ flex: 1 }}>
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
        </select>
        {type === 'linear' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12 }}>Angle</span>
            <input type="range" min="0" max="360" value={angle} onChange={e => setAngle(parseInt(e.target.value))} />
            <span style={{ fontSize: 12, width: 40 }}>{angle}°</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stops.map((stop, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input type="color" value={stop.c} onChange={e => updateStop(i, 'c', e.target.value)} style={{ width: 44, height: 44, padding: 0 }} />
            <input type="range" min="0" max="100" value={stop.p} onChange={e => updateStop(i, 'p', parseInt(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontSize: 12, width: 40 }}>{stop.p}%</span>
            <Button variant="danger" size="sm" onClick={() => removeStop(i)} disabled={stops.length <= 2} icon={<Trash size={14} />}> </Button>
          </div>
        ))}
      </div>
      
      {stops.length < 5 && <Button variant="secondary" onClick={addStop} icon={<Plus size={16} />}>Add Color</Button>}

      <div>
        <textarea readOnly value={`background: ${css};`} className="input-base" style={{ width: '100%', height: 80, fontFamily: 'var(--font-mono)' }} />
        <Button style={{ marginTop: 12 }} onClick={copy} icon={<Copy size={16} />}>Copy CSS</Button>
      </div>
    </div>
  );
}