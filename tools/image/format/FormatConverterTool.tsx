'use client';
import React, { useState, useRef } from 'react';
import { ArrowRight, Download, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

interface Props {
  fromLabel: string;
  toLabel: string;
  fromMime?: string;
  toMime: string;
  toExt: string;
  accept: string;
}

export function FormatConverterTool({
  fromLabel, toLabel, toMime, toExt, accept,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(88);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setConvertedBlob(null);
    setConvertedPreview(null);
    // Auto convert
    processConversion(f, url, quality);
  };

  const processConversion = async (currentFile: File, url: string, qVal: number) => {
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');

      // For JPEG, fill transparent backgrounds with white
      if (toMime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const q = toMime === 'image/png' ? undefined : qVal / 100;
      canvas.toBlob(blob => {
        if (blob) {
          setConvertedBlob(blob);
          if (convertedPreview) URL.revokeObjectURL(convertedPreview);
          setConvertedPreview(URL.createObjectURL(blob));
          toast.success(`Converted to ${toLabel}!`);
        }
        setIsProcessing(false);
      }, toMime, q);
    } catch {
      setIsProcessing(false);
      toast.error('Conversion failed');
    }
  };

  const handleDownload = () => {
    if (!convertedBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    downloadBlob(convertedBlob, `${base}.${toExt}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <RefreshCw size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose a {fromLabel} file to convert to {toLabel}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Instant client-side conversion &bull; No upload to remote servers
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>{formatFileSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)',
            }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{fromLabel}</span>
              <ArrowRight size={16} style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-accent)' }}>{toLabel}</span>
            </div>

            {toMime !== 'image/png' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  <span>Quality</span>
                  <span>{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={e => {
                    const q = Number(e.target.value);
                    setQuality(q);
                    if (previewUrl) processConversion(file, previewUrl, q);
                  }}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
              </div>
            )}

            {convertedBlob && (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
              }}>
                <span>Output size: <strong>{formatFileSize(convertedBlob.size)}</strong></span>
                <span style={{
                  color: convertedBlob.size < file.size ? 'var(--color-success)' : 'var(--color-muted)',
                  fontWeight: 600,
                }}>
                  {convertedBlob.size < file.size ? `-${calcReductionPct(file.size, convertedBlob.size)}% smaller` : `${formatFileSize(convertedBlob.size)}`}
                </span>
              </div>
            )}

            {convertedBlob && (
              <Button onClick={handleDownload} loading={isProcessing} icon={<Download size={15} />}>
                Download {toLabel} File
              </Button>
            )}
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden',
              background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={convertedPreview || previewUrl || ''}
                alt="Converted preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 13 Specialized exports
export function JpgToPngTool() {
  return <FormatConverterTool fromLabel="JPEG / JPG" toLabel="PNG" toMime="image/png" toExt="png" accept=".jpg,.jpeg,image/jpeg" />;
}
export function PngToJpgTool() {
  return <FormatConverterTool fromLabel="PNG" toLabel="JPEG" toMime="image/jpeg" toExt="jpg" accept=".png,image/png" />;
}
export function JpgToWebpTool() {
  return <FormatConverterTool fromLabel="JPEG / JPG" toLabel="WebP" toMime="image/webp" toExt="webp" accept=".jpg,.jpeg,image/jpeg" />;
}
export function PngToWebpTool() {
  return <FormatConverterTool fromLabel="PNG" toLabel="WebP" toMime="image/webp" toExt="webp" accept=".png,image/png" />;
}
export function WebpToJpgTool() {
  return <FormatConverterTool fromLabel="WebP" toLabel="JPEG" toMime="image/jpeg" toExt="jpg" accept=".webp,image/webp" />;
}
export function WebpToPngTool() {
  return <FormatConverterTool fromLabel="WebP" toLabel="PNG" toMime="image/png" toExt="png" accept=".webp,image/webp" />;
}
export function WebpToAvifTool() {
  return <FormatConverterTool fromLabel="WebP" toLabel="AVIF" toMime="image/avif" toExt="avif" accept=".webp,image/webp" />;
}
export function AvifToJpgTool() {
  return <FormatConverterTool fromLabel="AVIF" toLabel="JPEG" toMime="image/jpeg" toExt="jpg" accept=".avif,image/avif" />;
}
export function AvifToPngTool() {
  return <FormatConverterTool fromLabel="AVIF" toLabel="PNG" toMime="image/png" toExt="png" accept=".avif,image/avif" />;
}
export function HeicToJpgTool() {
  return <FormatConverterTool fromLabel="HEIC" toLabel="JPEG" toMime="image/jpeg" toExt="jpg" accept=".heic,.heif,image/heic,image/heif" />;
}
export function HeicToPngTool() {
  return <FormatConverterTool fromLabel="HEIC" toLabel="PNG" toMime="image/png" toExt="png" accept=".heic,.heif,image/heic,image/heif" />;
}
export function GifToJpgTool() {
  return <FormatConverterTool fromLabel="GIF" toLabel="JPEG" toMime="image/jpeg" toExt="jpg" accept=".gif,image/gif" />;
}
export function GifToPngTool() {
  return <FormatConverterTool fromLabel="GIF" toLabel="PNG" toMime="image/png" toExt="png" accept=".gif,image/gif" />;
}
