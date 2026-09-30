'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { downloadBlob } from '@/lib/utils';

export default function PlaceholderImageTool() {
  const [width, setWidth] = useState('800');
  const [height, setHeight] = useState('600');
  const [bgColor, setBgColor] = useState('#cccccc');
  const [textColor, setTextColor] = useState('#000000');
  const [text, setText] = useState('');
  const [format, setFormat] = useState('png');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = parseInt(width) || 800;
    const h = parseInt(height) || 600;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.min(w, h) / 10;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(text || `${w} × ${h}`, w / 2, h / 2);
  }, [width, height, bgColor, textColor, text]);

  return (
    <div className="card flex flex-col items-center">
      <div className="grid grid-cols-2 gap-4 w-full mb-4">
        <label>Width: <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full p-2" /></label>
        <label>Height: <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full p-2" /></label>
        <label>BG Color: <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} /></label>
        <label>Text Color: <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} /></label>
        <label>Text: <input type="text" placeholder="Default: W × H" value={text} onChange={e => setText(e.target.value)} className="w-full p-2" /></label>
        <label>Format: 
          <select value={format} onChange={e => setFormat(e.target.value)} className="w-full p-2">
            <option value="png">PNG</option><option value="jpeg">JPEG</option>
          </select>
        </label>
      </div>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '400px', border: '1px solid var(--color-border)' }} className="mb-4" />
      <Button onClick={() => {
        canvasRef.current?.toBlob(blob => {
          if (blob) { downloadBlob(blob, `placeholder.${format}`); toast.success('Downloaded'); }
        }, `image/${format}`);
      }} variant="primary">Download {format.toUpperCase()}</Button>
    </div>
  );
}
