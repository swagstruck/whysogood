'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { Copy, Download } from 'lucide-react';
import { generateSvgWave } from '@/lib/design/engines';

export default function SvgWaveTool() {
  const [type, setType] = useState<'sine' | 'triangle' | 'peaks'>('sine');
  const [amplitude, setAmplitude] = useState(50);
  const [frequency, setFrequency] = useState(2);
  const [color, setColor] = useState('#6366f1');
  const [flip, setFlip] = useState(false);
  const toast = useToast();

  const svgStr = generateSvgWave(type, amplitude, frequency, color, 300, flip);

  const copySvg = () => {
    copyToClipboard(svgStr);
    toast.success('Copied SVG code!');
  };

  const downloadSvg = () => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    downloadBlob(blob, 'wave.svg');
    toast.success('Downloaded wave.svg!');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12 }}>Wave Type</label>
          <select value={type} onChange={e => setType(e.target.value as any)} className="input-base" style={{ width: '100%' }}>
            <option value="sine">Smooth Sine</option>
            <option value="triangle">Triangle</option>
            <option value="peaks">Peaks</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12 }}>Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%', height: 44, padding: 0 }} />
        </div>
        <div>
          <label style={{ fontSize: 12 }}>Amplitude ({amplitude})</label>
          <input type="range" min="10" max="200" value={amplitude} onChange={e => setAmplitude(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12 }}>Frequency ({frequency})</label>
          <input type="range" min="1" max="10" step="0.5" value={frequency} onChange={e => setFrequency(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={flip} onChange={e => setFlip(e.target.checked)} />
            Flip Wave Direction
          </label>
        </div>
      </div>

      <div style={{ width: '100%', height: 300, background: 'var(--color-surface2)', borderRadius: 8, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: svgStr }} />

      <div style={{ display: 'flex', gap: 16 }}>
        <Button onClick={copySvg} icon={<Copy size={16} />}>Copy SVG Code</Button>
        <Button variant="secondary" onClick={downloadSvg} icon={<Download size={16} />}>Download SVG</Button>
      </div>
    </div>
  );
}