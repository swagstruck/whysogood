'use client';
import React, { useState, useRef } from 'react';
import { RefreshCw, Download, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob, uid } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { zipSync } from 'fflate';

interface BatchItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  previewUrl: string;
  status: 'pending' | 'done' | 'error';
  convertedBlob?: Blob;
}

const FORMATS = [
  { label: 'WebP (Recommended)', value: 'image/webp', ext: 'webp' },
  { label: 'PNG (Lossless)', value: 'image/png', ext: 'png' },
  { label: 'JPEG (.jpg)', value: 'image/jpeg', ext: 'jpg' },
  { label: 'BMP (.bmp)', value: 'image/bmp', ext: 'bmp' },
];

export default function BatchImageConverterTool() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [targetFormat, setTargetFormat] = useState('image/webp');
  const [quality, setQuality] = useState(85);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: BatchItem[] = Array.from(files).map(file => ({
      id: uid(),
      file,
      name: file.name,
      originalSize: file.size,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const processBatch = async () => {
    if (!items.length) return;
    setIsProcessing(true);

    try {
      const updated = await Promise.all(
        items.map(async item => {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((res, rej) => {
              img.onload = res;
              img.onerror = rej;
              img.src = item.previewUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No context');

            if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0);

            const q = targetFormat === 'image/png' ? undefined : quality / 100;
            const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, targetFormat, q));
            if (!blob) throw new Error('Conversion failed');

            return { ...item, status: 'done' as const, convertedBlob: blob };
          } catch {
            return { ...item, status: 'error' as const };
          }
        })
      );
      setItems(updated);
      toast.success('Batch conversion complete!');
    } catch {
      toast.error('Batch conversion error');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllZip = () => {
    const ready = items.filter(i => i.status === 'done' && i.convertedBlob);
    if (!ready.length) return;

    const fmt = FORMATS.find(f => f.value === targetFormat);
    const ext = fmt ? fmt.ext : 'img';

    const zipFiles: Record<string, Uint8Array> = {};
    Promise.all(
      ready.map(async item => {
        const buf = new Uint8Array(await item.convertedBlob!.arrayBuffer());
        const base = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        zipFiles[`${base}.${ext}`] = buf;
      })
    ).then(() => {
      const zipped = zipSync(zipFiles);
      downloadBlob(new Blob([zipped as unknown as BlobPart], { type: 'application/zip' }), `converted_${ext}_images.zip`);
    });
  };

  const clearAll = () => {
    items.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
  };

  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Upload Zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
        }}>
          <RefreshCw size={26} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
          Drop multiple images to batch convert
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
          Convert bulk files to WebP, PNG, JPEG or BMP &bull; 100% Client-side
        </p>
      </div>

      {items.length > 0 && (
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>Target:</span>
                <select
                  value={targetFormat}
                  onChange={e => setTargetFormat(e.target.value)}
                  style={{
                    height: 32, padding: '0 10px', background: 'var(--color-surface2)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)', fontSize: 12, outline: 'none',
                  }}
                >
                  {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              {targetFormat !== 'image/png' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Quality: {quality}%</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                    style={{ width: 100, accentColor: 'var(--color-accent)' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button onClick={processBatch} loading={isProcessing}>
                Convert All ({items.length})
              </Button>
              {doneCount > 0 && (
                <Button variant="secondary" onClick={downloadAllZip} icon={<Archive size={15} />}>
                  Download ZIP ({doneCount})
                </Button>
              )}
              <Button variant="ghost" onClick={clearAll}>Clear</Button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                height: 110, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                {formatFileSize(item.originalSize)}
              </div>
              {item.status === 'done' && (
                <div style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>
                  Converted ({formatFileSize(item.convertedBlob?.size || 0)})
                </div>
              )}
              {item.status === 'done' && item.convertedBlob && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const fmt = FORMATS.find(f => f.value === targetFormat);
                    const base = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
                    downloadBlob(item.convertedBlob!, `${base}.${fmt?.ext || 'img'}`);
                  }}
                  icon={<Download size={13} />}
                >
                  Download
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
