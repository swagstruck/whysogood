'use client';
import React, { useState, useRef } from 'react';
import { LayoutGrid, Download, Archive, Trash2, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob, uid } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { zipSync } from 'fflate';

interface BatchItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  width: number;
  height: number;
  previewUrl: string;
  status: 'pending' | 'done' | 'error';
  resizedBlob?: Blob;
  resizedWidth?: number;
  resizedHeight?: number;
}

export default function BatchImageResizerTool() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [scaleMode, setScaleMode] = useState<'percent' | 'maxWidth'>('percent');
  const [scalePercent, setScalePercent] = useState(50);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: BatchItem[] = Array.from(files).map(file => {
      const url = URL.createObjectURL(file);
      const item: BatchItem = {
        id: uid(),
        file,
        name: file.name,
        originalSize: file.size,
        width: 0,
        height: 0,
        previewUrl: url,
        status: 'pending',
      };
      const img = new Image();
      img.onload = () => {
        item.width = img.naturalWidth;
        item.height = img.naturalHeight;
        setItems(curr => [...curr]);
      };
      img.src = url;
      return item;
    });
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

            let targetW = img.naturalWidth;
            let targetH = img.naturalHeight;

            if (scaleMode === 'percent') {
              targetW = Math.max(1, Math.round(img.naturalWidth * (scalePercent / 100)));
              targetH = Math.max(1, Math.round(img.naturalHeight * (scalePercent / 100)));
            } else {
              if (img.naturalWidth > maxWidth) {
                targetW = maxWidth;
                targetH = Math.max(1, Math.round((maxWidth / img.naturalWidth) * img.naturalHeight));
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No context');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetW, targetH);

            const mime = item.file.type || 'image/jpeg';
            const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, mime, 0.9));

            if (!blob) throw new Error('Blob creation failed');

            return {
              ...item,
              status: 'done' as const,
              resizedBlob: blob,
              resizedWidth: targetW,
              resizedHeight: targetH,
            };
          } catch {
            return { ...item, status: 'error' as const };
          }
        })
      );
      setItems(updated);
      toast.success('Batch resize finished!');
    } catch {
      toast.error('Batch resize failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllZip = () => {
    const ready = items.filter(i => i.status === 'done' && i.resizedBlob);
    if (!ready.length) return;

    const zipFiles: Record<string, Uint8Array> = {};
    Promise.all(
      ready.map(async item => {
        const buf = new Uint8Array(await item.resizedBlob!.arrayBuffer());
        const parts = item.name.split('.');
        const ext = parts.pop();
        const newName = `${parts.join('.')}_${item.resizedWidth}x${item.resizedHeight}.${ext}`;
        zipFiles[newName] = buf;
      })
    ).then(() => {
      const zipped = zipSync(zipFiles);
      downloadBlob(new Blob([zipped as unknown as BlobPart], { type: 'application/zip' }), 'resized_images.zip');
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
          <LayoutGrid size={26} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
          Drop multiple images to batch resize
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
          Batch scale by percentage or max dimension &bull; Download as ZIP &bull; 100% Client-side
        </p>
      </div>

      {items.length > 0 && (
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
                <button
                  onClick={() => setScaleMode('percent')}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: scaleMode === 'percent' ? 'var(--color-accent)' : 'transparent',
                    color: scaleMode === 'percent' ? '#fff' : 'var(--color-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Scale %
                </button>
                <button
                  onClick={() => setScaleMode('maxWidth')}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: scaleMode === 'maxWidth' ? 'var(--color-accent)' : 'transparent',
                    color: scaleMode === 'maxWidth' ? '#fff' : 'var(--color-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Max Width (px)
                </button>
              </div>

              {scaleMode === 'percent' ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[25, 50, 75].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setScalePercent(pct)}
                      className="btn-secondary"
                      style={{
                        height: 28, padding: '0 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                        borderColor: scalePercent === pct ? 'var(--color-accent)' : undefined,
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={scalePercent}
                    onChange={e => setScalePercent(Number(e.target.value))}
                    className="input-base"
                    style={{ width: 64, height: 28, padding: '0 6px', fontSize: 12 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>%</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[1280, 1920, 2560].map(px => (
                    <button
                      key={px}
                      onClick={() => setMaxWidth(px)}
                      className="btn-secondary"
                      style={{
                        height: 28, padding: '0 10px', fontSize: 12, borderRadius: 'var(--radius-sm)',
                        borderColor: maxWidth === px ? 'var(--color-accent)' : undefined,
                      }}
                    >
                      {px}px
                    </button>
                  ))}
                  <input
                    type="number"
                    value={maxWidth}
                    onChange={e => setMaxWidth(Number(e.target.value))}
                    className="input-base"
                    style={{ width: 80, height: 28, padding: '0 6px', fontSize: 12 }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button onClick={processBatch} loading={isProcessing}>
                Resize All ({items.length})
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

      {/* Item List */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                height: 120, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                Original: {item.width} × {item.height} px
              </div>
              {item.status === 'done' && (
                <div style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>
                  Resized: {item.resizedWidth} × {item.resizedHeight} px ({formatFileSize(item.resizedBlob?.size || 0)})
                </div>
              )}
              {item.status === 'done' && item.resizedBlob && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadBlob(item.resizedBlob!, `resized_${item.name}`)}
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
