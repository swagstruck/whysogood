'use client';
import React, { useState, useRef } from 'react';
import { Download, CheckCircle, FileImage, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob, uid } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompressor';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const compressSingle = async (item: ImageItem, qVal = 82): Promise<ImageItem> => {
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

  const handleFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const newItems: ImageItem[] = Array.from(files).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'img';
      return {
        id: uid(),
        file,
        name: file.name,
        originalSize: file.size,
        format: ext,
        previewUrl: URL.createObjectURL(file),
        status: 'processing' as const,
      };
    });

    setItems(prev => [...prev, ...newItems]);

    // Concurrency-throttled auto-compression (2 concurrent tasks)
    const concurrency = 2;
    let nextIndex = 0;

    const runWorker = async () => {
      while (nextIndex < newItems.length) {
        const itemToProcess = newItems[nextIndex++];
        const updated = await compressSingle(itemToProcess);
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      }
    };

    const count = Math.min(concurrency, newItems.length);
    for (let c = 0; c < count; c++) {
      runWorker();
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const it = prev.find(i => i.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

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

      {/* Output Cards */}
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
                  title="Remove image"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Status and Metrics */}
              {item.status === 'processing' && (
                <div style={{
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface2)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    Compressing...
                  </span>
                </div>
              )}

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
                  style={{ width: '100%', justifyContent: 'center' }}
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
