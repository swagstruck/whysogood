'use client';
import React, { useState, useRef } from 'react';
import { Gauge, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FieldMessage } from '@/components/ui/FieldMessage';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

const PRESETS = [72, 96, 150, 300, 600];

async function setJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes[3] === 0xe0) {
    const out = new Uint8Array(bytes);
    out[13] = 1;
    out[14] = (dpi >> 8) & 0xff; out[15] = dpi & 0xff;
    out[16] = (dpi >> 8) & 0xff; out[17] = dpi & 0xff;
    return new Blob([out as unknown as BlobPart], { type: 'image/jpeg' });
  }
  const jfif = [
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
    0x01, (dpi >> 8) & 0xff, dpi & 0xff,
    (dpi >> 8) & 0xff, dpi & 0xff, 0x00, 0x00
  ];
  const combined = new Uint8Array(jfif.length + bytes.length - 2);
  combined.set(jfif, 0);
  combined.set(bytes.subarray(2), jfif.length);
  return new Blob([combined as unknown as BlobPart], { type: 'image/jpeg' });
}

function dpiError(dpi: number): string | undefined {
  if (!dpi || dpi < 1) return 'DPI must be at least 1.';
  if (dpi > 2400) return 'DPI cannot exceed 2400.';
  if (!Number.isInteger(dpi)) return 'DPI must be a whole number.';
  return undefined;
}

export default function ImageDpiTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [dpi, setDpi] = useState<number>(300);
  const [dpiInput, setDpiInput] = useState('300');
  const [touched, setTouched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const err = touched ? dpiError(dpi) : undefined;

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => { setWidth(img.naturalWidth); setHeight(img.naturalHeight); };
    img.src = url;
  };

  const handleDpiChange = (val: string) => {
    setTouched(true);
    setDpiInput(val);
    setDpi(Number(val));
  };

  const printInchesW = width > 0 && dpi > 0 ? (width / dpi).toFixed(2) : '—';
  const printInchesH = height > 0 && dpi > 0 ? (height / dpi).toFixed(2) : '—';
  const printCmW = width > 0 && dpi > 0 ? ((width / dpi) * 2.54).toFixed(2) : '—';
  const printCmH = height > 0 && dpi > 0 ? ((height / dpi) * 2.54).toFixed(2) : '—';

  const handleDownload = async () => {
    setTouched(true);
    if (dpiError(dpi)) return;
    if (!file) return;
    setIsProcessing(true);
    try {
      const updatedBlob = await setJpegDpi(file, dpi);
      const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      downloadBlob(updatedBlob, `${base}_${dpi}dpi.jpg`);
      toast.success(`Exported with ${dpi} DPI`);
    } catch {
      toast.error('Failed to set DPI');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!file ? (
        <div role="button" tabIndex={0} onClick={() => inputRef.current?.click()}
          style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', padding: '48px 24px', textAlign: 'center', cursor: 'pointer' }}>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
          <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Gauge size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>Choose an image to inspect &amp; change DPI</p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>Calculate physical print dimensions and embed print resolution &bull; 100% Client-side</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>{width} × {height} px ({formatFileSize(file.size)})</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>DPI Presets</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRESETS.map(p => (
                  <button key={p} onClick={() => { setDpi(p); setDpiInput(String(p)); setTouched(false); }}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: dpi === p ? 'var(--color-accent)' : 'var(--color-border)', background: dpi === p ? 'var(--color-accent-subtle)' : 'var(--color-surface2)', color: dpi === p ? 'var(--color-accent)' : 'var(--color-text)', fontWeight: 600 }}>
                    {p} DPI
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>Target DPI / PPI</label>
              <input
                type="number" min={1} max={2400}
                value={dpiInput}
                onChange={e => handleDpiChange(e.target.value)}
                onBlur={() => setTouched(true)}
                className={`input-base${err ? ' input-base--error' : ''}`}
                aria-invalid={err ? 'true' : undefined}
                style={{ width: '100%', height: 38, padding: '0 10px', fontSize: 14, boxSizing: 'border-box' }}
              />
              {err
                ? <FieldMessage variant="error">{err}</FieldMessage>
                : <FieldMessage variant="hint">72 dpi = screen · 150 dpi = draft print · 300 dpi = professional print</FieldMessage>
              }
            </div>

            <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                <Printer size={15} style={{ color: 'var(--color-accent)' }} />
                <span>Print Dimensions at {dpi} DPI</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-muted)' }}>
                <span>Inches:</span>
                <strong style={{ color: 'var(--color-text)' }}>{printInchesW}″ × {printInchesH}″</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-muted)' }}>
                <span>Centimeters:</span>
                <strong style={{ color: 'var(--color-text)' }}>{printCmW} cm × {printCmH} cm</strong>
              </div>
            </div>

            <Button onClick={handleDownload} loading={isProcessing} icon={<Download size={15} />} disabled={!!err}>
              Download with {dpi} DPI
            </Button>
          </div>

          <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl || ''} alt="Preview" style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
