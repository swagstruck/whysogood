'use client';
import React, { useState, useRef } from 'react';
import { Download, CheckCircle, FileImage, Trash2, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob, uid } from '@/lib/utils';
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
  probedBaseSize?: number;
}

/**
 * Calculates accurate real-time estimated size following the quality retention curve.
 */
function getEstimatedSize(item: ImageItem, quality: number): number {
  const base = item.probedBaseSize || Math.round(item.originalSize * 0.4);
  // Scaling factor relative to 80% baseline
  const factor = Math.pow(quality / 80, 1.35);
  const estimated = Math.round(base * factor);
  return Math.max(Math.round(item.originalSize * 0.005), Math.min(Math.round(item.originalSize * 0.98), estimated));
}

export default function ImageCompressorTool() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [quality, setQuality] = useState(82);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCompressed, setHasCompressed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const newItems: ImageItem[] = Array.from(files).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'img';
      // Initial heuristic based on format and file size
      let defaultRatio = 0.45;
      if (ext === 'png') {
        defaultRatio = file.size > 10 * 1024 * 1024 ? 0.015 : 0.25;
      } else if (ext === 'svg') {
        defaultRatio = 0.70;
      } else if (ext === 'webp') {
        defaultRatio = 0.40;
      }

      return {
        id: uid(),
        file,
        name: file.name,
        originalSize: file.size,
        format: ext,
        previewUrl: URL.createObjectURL(file),
        status: 'pending' as const,
        probedBaseSize: Math.round(file.size * defaultRatio),
      };
    });

    setItems(newItems);
    setHasCompressed(false);

    // Fast background probe to calibrate real-time slider to the file's exact compression curve
    newItems.forEach(async item => {
      try {
        const probeRes = await compressImage(item.file, { quality: 0.80 });
        if (probeRes && probeRes.compressedSize > 0) {
          setItems(prev =>
            prev.map(i => (i.id === item.id ? { ...i, probedBaseSize: probeRes.compressedSize } : i))
          );
        }
      } catch {
        // Fallback safely to initial heuristic
      }
    });
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

  const handleCompress = async () => {
    if (!items.length) return;
    setIsProcessing(true);

    const concurrency = 2;
    let nextIndex = 0;
    const updatedItems = [...items];

    const runWorker = async () => {
      while (nextIndex < items.length) {
        const idx = nextIndex++;
        const itemToProcess = items[idx];
        const res = await compressSingle(itemToProcess, quality);
        updatedItems[idx] = res;
        setItems([...updatedItems]);
      }
    };

    const count = Math.min(concurrency, items.length);
    const workerPromises = [];
    for (let c = 0; c < count; c++) {
      workerPromises.push(runWorker());
    }

    await Promise.all(workerPromises);
    setIsProcessing(false);
    setHasCompressed(true);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const it = prev.find(i => i.id === id);
      if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      const remaining = prev.filter(i => i.id !== id);
      if (remaining.length === 0) {
        setHasCompressed(false);
      }
      return remaining;
    });
  };

  const clearAll = () => {
    items.forEach(i => {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
    });
    setItems([]);
    setHasCompressed(false);
  };

  const totalOriginal = items.reduce((acc, i) => acc + i.originalSize, 0);
  const totalApproxSize = items.reduce(
    (acc, i) => acc + getEstimatedSize(i, quality),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Upload Zone (Placeholder remains unchanged) */}
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

      {/* Before Compression: Quality Decision & Compress CTA */}
      {items.length > 0 && !hasCompressed && (
        <div
          className="card"
          style={{
            maxWidth: 500,
            width: '100%',
            margin: '0 auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              Choose Compression Quality
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Quality:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 15 }}>
                  {quality}%
                </span>
                <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>
                  (Approx. ~{formatFileSize(totalApproxSize)})
                </span>
              </div>
            </div>

            <input
              type="range"
              min={20}
              max={95}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--color-muted)' }}>
              <span>Original: {formatFileSize(totalOriginal)}</span>
              <span>Estimated reduction: ~{calcReductionPct(totalOriginal, totalApproxSize)}%</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 4 }}>
            <Button
              onClick={handleCompress}
              loading={isProcessing}
              style={{ minWidth: 150, justifyContent: 'center', height: 40 }}
            >
              {isProcessing ? 'Compressing...' : 'Compress'}
            </Button>
            <Button variant="ghost" onClick={clearAll} style={{ height: 40 }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* After Compression: Centered Output Card with Old & New File Size and Download Button */}
      {hasCompressed && items.length > 0 && (
        <div style={{ maxWidth: 440, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(item => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
              }}
            >
              {/* File Info Row */}
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
                  <p style={{
                    margin: '0 0 4px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                    Original: {formatFileSize(item.originalSize)}
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

              {/* Old vs New File Size Comparison */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-muted)', display: 'block', marginBottom: 2 }}>
                    New Size (Compressed)
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                    {formatFileSize(item.compressedSize || item.originalSize)}
                  </span>
                </div>

                <div>
                  {item.reductionPct && item.reductionPct > 0 ? (
                    <span style={{
                      color: 'var(--color-success)',
                      fontWeight: 700,
                      fontSize: 14,
                      background: 'rgba(34, 197, 94, 0.12)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      -{item.reductionPct}%
                    </span>
                  ) : (
                    <span style={{
                      color: 'var(--color-muted)',
                      fontWeight: 600,
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                      Already Optimal
                    </span>
                  )}
                </div>
              </div>

              {/* Single Centered Download Button */}
              {item.compressedBlob && (
                <Button
                  variant="secondary"
                  onClick={() => downloadBlob(item.compressedBlob!, `compressed_${item.name}`)}
                  icon={<Download size={15} />}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    height: 42,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Download
                </Button>
              )}

              {/* Re-adjust link */}
              <button
                onClick={() => setHasCompressed(false)}
                style={{
                  border: 'none', background: 'none', color: 'var(--color-accent)',
                  fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'underline'
                }}
              >
                Change quality or re-compress
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
