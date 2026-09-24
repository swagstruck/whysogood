'use client';
import React, { useState, useRef } from 'react';
import { Download, Archive, CheckCircle, FileImage, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob, uid } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompressor';
import { createStreamingZip, type ArchiveFileEntry } from '@/lib/archiveUtils';

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
  statusMessage?: string;
  compressionStatus?: 'compressed' | 'optimal' | 'fallback' | 'original';
  tierUsed?: 1 | 2 | 3;
  errorMessage?: string;
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
      const result = await compressImage(item.file, {
        quality: qVal / 100,
      });

      const saved = Math.max(0, item.originalSize - result.compressedSize);
      return {
        ...item,
        status: 'done',
        compressedBlob: result.blob,
        compressedSize: result.compressedSize,
        savedBytes: saved,
        reductionPct: result.reductionPercentage,
        statusMessage: result.statusMessage,
        compressionStatus: result.status,
        tierUsed: result.tierUsed,
      };
    } catch (err: unknown) {
      // Safety tier guarantee: even on unexpected error, return original file intact with done status
      return {
        ...item,
        status: 'done',
        compressedBlob: item.file,
        compressedSize: item.originalSize,
        savedBytes: 0,
        reductionPct: 0,
        statusMessage: err instanceof Error ? `Preserved (${err.message})` : 'File preserved intact',
        compressionStatus: 'original',
        tierUsed: 3,
      };
    }
  };

  const processAll = async () => {
    if (!items.length) return;
    setIsProcessing(true);

    const pending = items.filter(i => i.status !== 'done');
    if (!pending.length) {
      setIsProcessing(false);
      return;
    }

    setItems(prev => prev.map(i => (i.status !== 'done' ? { ...i, status: 'processing' } : i)));

    const concurrency = 2; // Strict concurrency throttling for mobile memory safety
    let nextIndex = 0;

    const runWorker = async () => {
      while (nextIndex < pending.length) {
        const itemToProcess = pending[nextIndex++];
        const updated = await compressSingle(itemToProcess, quality);
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      }
    };

    const workerPromises: Promise<void>[] = [];
    const count = Math.min(concurrency, pending.length);
    for (let c = 0; c < count; c++) {
      workerPromises.push(runWorker());
    }

    await Promise.all(workerPromises);
    setIsProcessing(false);
  };

  const downloadAllZip = async () => {
    const ready = items.filter(i => i.status === 'done' && i.compressedBlob);
    if (!ready.length) return;

    try {
      const entries: ArchiveFileEntry[] = ready.map(item => ({
        name: item.name,
        data: item.compressedBlob!,
      }));
      const zipBlob = await createStreamingZip(entries);
      downloadBlob(zipBlob, 'compressed_images.zip');
    } catch (err) {
      console.error('Failed to create ZIP archive:', err);
    }
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
              <span><strong>{doneCount}</strong> of {items.length} files processed</span>
              <span style={{ color: totalSaved > 0 ? 'var(--color-success)' : 'var(--color-muted)', fontWeight: 600 }}>
                {totalSaved > 0
                  ? `Saved ${formatFileSize(totalSaved)} (${calcReductionPct(totalOriginal, totalCompressed)}% smaller)`
                  : 'Files are already optimal'}
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
                  background: 'var(--color-surface2)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{formatFileSize(item.compressedSize || item.originalSize)}</span>
                  {item.reductionPct && item.reductionPct > 0 ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                      -{item.reductionPct}%
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
                      Already Optimal
                    </span>
                  )}
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
