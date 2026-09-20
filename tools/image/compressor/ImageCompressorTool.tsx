'use client';
import React, { useState, useRef } from 'react';
import { Download, Archive, RefreshCw, AlertTriangle, CheckCircle, FileImage, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { formatFileSize, calcReductionPct, downloadBlob, uid } from '@/lib/utils';
import { zipSync } from 'fflate';

interface ImageItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  format: string;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  compressedBlob?: Blob;
  compressedSize?: number;
  savedBytes?: number;
  reductionPct?: number;
  errorMessage?: string;
}

// SVG minifier
function minifySvg(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
    .replace(/\s+xmlns:(inkscape|sodipodi|sketch|i|adobe)="[^"]*"/gi, '')
    .replace(/\s+(inkscape|sodipodi|sketch):[a-zA-Z0-9_-]+="[^"]*"/gi, '')
    .replace(/\s+version="1\.[01]"/gi, '')
    .replace(/\s+xml:space="preserve"/gi, '')
    .replace(/>\s+</g, '><')
    .trim();
}

// Strip JPEG metadata
function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      while (i < bytes.length) out.push(bytes[i++]);
      break;
    }
    const marker = bytes[i + 1];
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xd9) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }
    if (marker === 0xda) {
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      for (let j = 0; j < len + 2 && i + j < bytes.length; j++) out.push(bytes[i + j]);
      i += len + 2;
      while (i < bytes.length) {
        out.push(bytes[i]);
        if (bytes[i] === 0xff && i + 1 < bytes.length && bytes[i + 1] === 0xd9) {
          out.push(bytes[i + 1]);
          i += 2;
          break;
        }
        i++;
      }
      break;
    }
    if (i + 4 > bytes.length) break;
    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
    const strip = marker === 0xe1 || (marker >= 0xe2 && marker <= 0xef) || marker === 0xfe;
    if (!strip) {
      for (let j = 0; j < segLen + 2 && i + j < bytes.length; j++) out.push(bytes[i + j]);
    }
    i += segLen + 2;
  }
  return new Uint8Array(out);
}

export default function ImageCompressorTool() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [quality, setQuality] = useState(82);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: ImageItem[] = Array.from(files).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'img';
      return {
        id: uid(),
        file,
        name: file.name,
        originalSize: file.size,
        format: ext,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
      };
    });
    setItems(prev => [...prev, ...newItems]);
  };

  const compressSingle = async (item: ImageItem, qVal: number): Promise<ImageItem> => {
    try {
      const buffer = await item.file.arrayBuffer();
      const ext = item.format.toLowerCase();

      // SVG handling
      if (ext === 'svg' || item.file.type.includes('svg')) {
        const text = new TextDecoder().decode(buffer);
        const minified = minifySvg(text);
        const outBlob = new Blob([minified], { type: 'image/svg+xml' });
        const saved = Math.max(0, item.originalSize - outBlob.size);
        return {
          ...item,
          status: 'done',
          compressedBlob: outBlob,
          compressedSize: outBlob.size,
          savedBytes: saved,
          reductionPct: calcReductionPct(item.originalSize, outBlob.size),
        };
      }

      // Raster image handling via OffscreenCanvas / HTMLCanvasElement
      const imgBitmap = await createImageBitmap(new Blob([buffer], { type: item.file.type }));
      const { width, height } = imgBitmap;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(imgBitmap, 0, 0);
      imgBitmap.close();

      const qFactor = qVal / 100;
      let targetMime = item.file.type;
      if (!targetMime || targetMime === 'application/octet-stream') {
        targetMime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      }

      let outBlob: Blob;
      if (targetMime === 'image/jpeg') {
        const rawBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: qFactor });
        const stripped = stripJpegMetadata(new Uint8Array(await rawBlob.arrayBuffer()));
        outBlob = new Blob([stripped as unknown as BlobPart], { type: 'image/jpeg' });
      } else if (targetMime === 'image/webp') {
        outBlob = await canvas.convertToBlob({ type: 'image/webp', quality: qFactor });
      } else {
        outBlob = await canvas.convertToBlob({ type: 'image/png' });
      }

      // If compressed is bigger than original, retain original blob
      const finalBlob = outBlob.size < item.originalSize ? outBlob : new Blob([buffer], { type: item.file.type });
      const finalSize = finalBlob.size;
      const saved = Math.max(0, item.originalSize - finalSize);

      return {
        ...item,
        status: 'done',
        compressedBlob: finalBlob,
        compressedSize: finalSize,
        savedBytes: saved,
        reductionPct: calcReductionPct(item.originalSize, finalSize),
      };
    } catch (err: unknown) {
      return {
        ...item,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Compression failed',
      };
    }
  };

  const processAll = async () => {
    if (!items.length) return;
    setIsProcessing(true);
    const updated = await Promise.all(
      items.map(async item => {
        if (item.status === 'done') return item;
        return await compressSingle(item, quality);
      })
    );
    setItems(updated);
    setIsProcessing(false);
  };

  const downloadAllZip = () => {
    const ready = items.filter(i => i.status === 'done' && i.compressedBlob);
    if (!ready.length) return;

    const zipFiles: Record<string, Uint8Array> = {};
    const seenNames = new Set<string>();

    Promise.all(
      ready.map(async item => {
        const buf = new Uint8Array(await item.compressedBlob!.arrayBuffer());
        let name = item.name;
        if (seenNames.has(name)) {
          const parts = name.split('.');
          const ext = parts.pop();
          name = `${parts.join('.')}_${uid().slice(0, 4)}.${ext}`;
        }
        seenNames.add(name);
        zipFiles[name] = buf;
      })
    ).then(() => {
      const zipped = zipSync(zipFiles);
      downloadBlob(new Blob([zipped as unknown as BlobPart], { type: 'application/zip' }), 'compressed_images.zip');
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const it = prev.find(i => i.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
    setItems([]);
  };

  const doneCount = items.filter(i => i.status === 'done').length;
  const totalOriginal = items.reduce((acc, i) => acc + i.originalSize, 0);
  const totalCompressed = items.reduce((acc, i) => acc + (i.compressedSize || i.originalSize), 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          transition: 'border-color var(--transition-fast)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.bmp,.ico,.gif,.avif,.tiff"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <FileImage size={24} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
          Drop images here or choose files
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
          JPG, PNG, WebP, SVG, BMP, ICO &bull; Unlimited files &bull; 100% Client-Side
        </p>
      </div>

      {/* Controls */}
      {items.length > 0 && (
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ width: '100%', maxWidth: 360 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                <span>Quality</span>
                <span style={{ color: 'var(--color-accent)' }}>{quality}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={95}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button onClick={processAll} loading={isProcessing}>
                {isProcessing ? 'Compressing...' : 'Compress All'}
              </Button>
              {doneCount > 0 && (
                <Button variant="secondary" onClick={downloadAllZip} icon={<Archive size={15} />}>
                  Download ZIP ({doneCount})
                </Button>
              )}
              <Button variant="ghost" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>

          {/* Batch Summary */}
          {doneCount > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface2)', fontSize: 13,
            }}>
              <span><strong>{doneCount}</strong> of {items.length} files compressed</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                Saved {formatFileSize(totalSaved)} ({calcReductionPct(totalOriginal, totalCompressed)}% smaller)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Images List */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface2)', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FileImage size={24} style={{ color: 'var(--color-muted)' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                    {formatFileSize(item.originalSize)}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ border: 'none', background: 'none', color: 'var(--color-faint)', cursor: 'pointer', padding: 4 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Status and Metrics */}
              {item.status === 'done' && (
                <div style={{
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface2)', fontSize: 12, display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>{formatFileSize(item.compressedSize || item.originalSize)}</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    -{item.reductionPct}%
                  </span>
                </div>
              )}

              {item.status === 'error' && (
                <div style={{ fontSize: 12, color: 'var(--color-error)' }}>
                  {item.errorMessage || 'Error processing'}
                </div>
              )}

              {item.status === 'done' && item.compressedBlob && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadBlob(item.compressedBlob!, `compressed_${item.name}`)}
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
