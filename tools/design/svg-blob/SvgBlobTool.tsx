'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { Copy, Download, RefreshCw } from 'lucide-react';
import { generateSvgBlob } from '@/lib/design/engines';

export default function SvgBlobTool() {
  const [complexity, setComplexity] = useState(6);
  const [seed, setSeed] = useState(1);
  const [color, setColor] = useState('#6366f1');
  const [size, setSize] = useState(300);
  const toast = useToast();

  const svgStr = generateSvgBlob(complexity, seed).replace('currentColor', color);

  const regenerate = () => setSeed(Math.random() * 1000);

  const copySvg = () => {
    copyToClipboard(svgStr);
    toast.success('Copied SVG code!');
  };

  const downloadSvg = () => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    downloadBlob(blob, 'blob.svg');
    toast.success('Downloaded blob.svg!');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1 }}><label style={{ fontSize: 12 }}>Complexity ({complexity})</label><input type="range" min="3" max="12" value={complexity} onChange={e => setComplexity(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
          <div style={{ flex: 1 }}><label style={{ fontSize: 12 }}>Size ({size}px)</label><input type="range" min="200" max="800" value={size} onChange={e => setSize(parseInt(e.target.value))} style={{ width: '100%' }} /></div>
          <div><label style={{ fontSize: 12 }}>Color</label><input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 44, height: 44, padding: 0, display: 'block' }} /></div>
          <Button variant="secondary" onClick={regenerate} icon={<RefreshCw size={16} />}>Regenerate</Button>
        </div>
      </div>

      <div style={{ width: '100%', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface2)', borderRadius: 8, padding: 24 }}>
        <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svgStr }} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Button onClick={copySvg} icon={<Copy size={16} />}>Copy SVG Code</Button>
        <Button variant="secondary" onClick={downloadSvg} icon={<Download size={16} />}>Download SVG</Button>
      </div>
    </div>
  );
}