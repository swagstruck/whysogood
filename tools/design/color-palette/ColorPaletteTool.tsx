'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { Download, Copy } from 'lucide-react';
import { generatePalette, PaletteType } from '@/lib/design/engines';

export default function ColorPaletteTool() {
  const [baseColor, setBaseColor] = useState('#6366f1');
  const [type, setType] = useState<PaletteType>('complementary');
  const toast = useToast();

  const palette = generatePalette(baseColor, type);

  const copyCssVars = () => {
    const css = palette.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n');
    copyToClipboard(`:root {\n${css}\n}`);
    toast.success('Copied CSS Variables!');
  };

  const copyHex = (hex: string) => {
    copyToClipboard(hex);
    toast.success(`Copied ${hex}!`);
  };

  const downloadSvg = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${palette.length * 100}" height="100">
      ${palette.map((c, i) => `<rect x="${i * 100}" y="0" width="100" height="100" fill="${c}" />`).join('')}
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadBlob(blob, 'palette.svg');
    toast.success('Downloaded palette.svg');
  };

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)} style={{ width: 44, height: 44, padding: 0 }} />
        <select value={type} onChange={e => setType(e.target.value as PaletteType)} className="input-base" style={{ flex: 1 }}>
          <option value="complementary">Complementary</option>
          <option value="triadic">Triadic</option>
          <option value="analogous">Analogous</option>
          <option value="split-complementary">Split-Complementary</option>
          <option value="tetradic">Tetradic</option>
          <option value="monochromatic">Monochromatic</option>
          <option value="shades">Shades</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, height: 120 }}>
        {palette.map((hex, i) => (
          <div key={i} onClick={() => copyHex(hex)} style={{ flex: 1, backgroundColor: hex, cursor: 'pointer', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 }}>
            <div style={{ background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 12, textAlign: 'center', borderRadius: 4, padding: '2px 0' }}>{hex}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Button onClick={copyCssVars} icon={<Copy size={16} />}>Copy as CSS Variables</Button>
        <Button variant="secondary" onClick={downloadSvg} icon={<Download size={16} />}>Download as SVG</Button>
      </div>
    </div>
  );
}