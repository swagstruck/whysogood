'use client';

import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
// @ts-ignore
import QRCode from 'qrcode';
import { useToast } from '@/components/ui/ToastProvider';
import { downloadBlob } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function QrGeneratorTool() {
  const [text, setText] = useState('');
  const [size, setSize] = useState('256');
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [margin, setMargin] = useState(true);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    QRCode.toCanvas(canvasRef.current, text, {
      width: parseInt(size),
      errorCorrectionLevel: errorCorrection as any,
      margin: margin ? 4 : 0,
      color: { dark: fgColor, light: bgColor }
    }).catch((err: any) => {
      console.error(err);
    });
  }, [text, size, errorCorrection, margin, fgColor, bgColor]);

  const handleDownloadPng = () => {
    if (!canvasRef.current || !text) return;
    canvasRef.current.toBlob(blob => {
      if (blob) {
        downloadBlob(blob, 'qr.png');
        toast.success('Downloaded PNG');
      }
    });
  };

  const handleDownloadSvg = async () => {
    if (!text) return;
    try {
      const svg = await QRCode.toString(text, {
        type: 'svg',
        width: parseInt(size),
        errorCorrectionLevel: errorCorrection as any,
        margin: margin ? 4 : 0,
        color: { dark: fgColor, light: bgColor }
      });
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      downloadBlob(blob, 'qr.svg');
      toast.success('Downloaded SVG');
    } catch (err) {
      toast.error('Error generating SVG');
    }
  };

  return (
    <div className="card">
      <input type="text" placeholder="Enter URL, text, email, phone..." value={text} onChange={e => setText(e.target.value)} className="w-full p-2 mb-4" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <label>Size: <input type="range" min="128" max="1024" value={size} onChange={e => setSize(e.target.value)} /></label>
        <label>Error Correction:
          <select value={errorCorrection} onChange={e => setErrorCorrection(e.target.value)}>
            <option value="L">L</option><option value="M">M</option><option value="Q">Q</option><option value="H">H</option>
          </select>
        </label>
        <label><input type="checkbox" checked={margin} onChange={e => setMargin(e.target.checked)} /> Margin</label>
        <label>FG Color: <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} /></label>
        <label>BG Color: <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} /></label>
      </div>
      <div className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} style={{ display: text ? 'block' : 'none' }} />
        {text && (
          <div className="flex gap-2">
            <Button onClick={handleDownloadPng} variant="primary">Download PNG</Button>
            <Button onClick={handleDownloadSvg} variant="secondary">Download SVG</Button>
          </div>
        )}
      </div>
    </div>
  );
}
