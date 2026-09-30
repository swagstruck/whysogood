'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { downloadBlob } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// Minimal Code128 B implementation
function encodeCode128B(text: string) {
  const START_B = 104;
  const STOP = 106;
  const charset = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7F";
  const patterns = [
    "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212",
    "112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131",
    "311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321",
    "112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121",
    "313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
    "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114",
    "122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212",
    "124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113",
    "114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"
  ];

  let sum = START_B;
  let chars = [START_B];
  
  for (let i = 0; i < text.length; i++) {
    const val = charset.indexOf(text[i]);
    if (val === -1) continue;
    chars.push(val);
    sum += val * (i + 1);
  }
  
  chars.push(sum % 103);
  chars.push(STOP);
  
  let result = '';
  for (let c of chars) {
    const pat = c === STOP ? patterns[STOP] : patterns[c];
    for (let i = 0; i < pat.length; i++) {
      const width = parseInt(pat[i]);
      const color = i % 2 === 0 ? '1' : '0';
      result += color.repeat(width);
    }
  }
  return result;
}

export default function BarcodeGeneratorTool() {
  const [text, setText] = useState('CODE128');
  const [width, setWidth] = useState('2');
  const [height, setHeight] = useState('100');
  const [showText, setShowText] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const binary = encodeCode128B(text);
    const bw = parseInt(width);
    const bh = parseInt(height);
    const totalWidth = binary.length * bw;
    
    canvas.width = totalWidth + 40;
    canvas.height = bh + (showText ? 40 : 20);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#000000';
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        ctx.fillRect(20 + i * bw, 10, bw, bh);
      }
    }
    
    if (showText) {
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, canvas.width / 2, bh + 35);
    }
  }, [text, width, height, showText]);

  return (
    <div className="card">
      <input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full p-2 mb-4" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <label>Bar Width: <input type="range" min="1" max="5" value={width} onChange={e => setWidth(e.target.value)} /></label>
        <label>Height: <input type="range" min="50" max="200" value={height} onChange={e => setHeight(e.target.value)} /></label>
        <label><input type="checkbox" checked={showText} onChange={e => setShowText(e.target.checked)} /> Show Text</label>
      </div>
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} style={{ border: '1px solid var(--color-border)' }} />
        <Button onClick={() => {
          canvasRef.current?.toBlob(blob => {
            if(blob) { downloadBlob(blob, 'barcode.png'); toast.success('Downloaded'); }
          })
        }} variant="primary">Download PNG</Button>
      </div>
    </div>
  );
}
