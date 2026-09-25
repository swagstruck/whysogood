'use client';
import React, { useState, useRef } from 'react';
import { RefreshCw, Download, ArrowRight, Sliders, CheckCircle2, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

interface DetectedFormat {
  label: string;
  ext: string;
  mime: string;
  badge: string;
  isSvg: boolean;
}

function detectInputFormat(file: File): DetectedFormat {
  const nameParts = file.name.split('.');
  const ext = (nameParts.length > 1 ? nameParts.pop() : '')?.toLowerCase() || '';
  const type = file.type.toLowerCase();

  if (ext === 'svg' || type === 'image/svg+xml') {
    return { label: 'SVG Vector Image', ext: 'svg', mime: 'image/svg+xml', badge: 'SVG', isSvg: true };
  }
  if (ext === 'png' || type === 'image/png') {
    return { label: 'PNG Lossless Image', ext: 'png', mime: 'image/png', badge: 'PNG', isSvg: false };
  }
  if (ext === 'jpg' || ext === 'jpeg' || type === 'image/jpeg') {
    return { label: 'JPEG Image', ext: 'jpg', mime: 'image/jpeg', badge: 'JPG', isSvg: false };
  }
  if (ext === 'webp' || type === 'image/webp') {
    return { label: 'WebP Modern Image', ext: 'webp', mime: 'image/webp', badge: 'WebP', isSvg: false };
  }
  if (ext === 'avif' || type === 'image/avif') {
    return { label: 'AVIF Next-Gen Image', ext: 'avif', mime: 'image/avif', badge: 'AVIF', isSvg: false };
  }
  if (ext === 'heic' || ext === 'heif' || type.includes('heic') || type.includes('heif')) {
    return { label: 'HEIC Apple Photo', ext: 'heic', mime: 'image/heic', badge: 'HEIC', isSvg: false };
  }
  if (ext === 'gif' || type === 'image/gif') {
    return { label: 'GIF Image', ext: 'gif', mime: 'image/gif', badge: 'GIF', isSvg: false };
  }
  if (ext === 'bmp' || type === 'image/bmp') {
    return { label: 'BMP Bitmap Image', ext: 'bmp', mime: 'image/bmp', badge: 'BMP', isSvg: false };
  }
  if (ext === 'tiff' || ext === 'tif' || type.includes('tiff')) {
    return { label: 'TIFF High-Res Image', ext: 'tiff', mime: 'image/tiff', badge: 'TIFF', isSvg: false };
  }
  if (ext === 'ico' || type.includes('icon')) {
    return { label: 'ICO Icon File', ext: 'ico', mime: 'image/x-icon', badge: 'ICO', isSvg: false };
  }

  return {
    label: (ext ? ext.toUpperCase() : 'Image') + ' Format',
    ext: ext || 'img',
    mime: type || 'image/*',
    badge: (ext ? ext.toUpperCase() : 'IMG'),
    isSvg: false,
  };
}

const OUTPUT_FORMATS = [
  { value: 'image/png', label: 'PNG (.png) — Lossless, Transparent', ext: 'png', isLossless: true },
  { value: 'image/jpeg', label: 'JPEG (.jpg) — Universal, Compact', ext: 'jpg', isLossless: false },
  { value: 'image/webp', label: 'WebP (.webp) — Modern Web Standard', ext: 'webp', isLossless: false },
  { value: 'image/avif', label: 'AVIF (.avif) — Ultra-Efficient Next-Gen', ext: 'avif', isLossless: false },
  { value: 'image/bmp', label: 'BMP (.bmp) — Uncompressed Bitmap', ext: 'bmp', isLossless: true },
];

function getDefaultOutputFormat(inputExt: string, initialOutput?: string): string {
  if (initialOutput) return initialOutput;
  const ext = inputExt.toLowerCase();
  if (ext === 'png') return 'image/jpeg';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/png';
  if (ext === 'webp') return 'image/png';
  if (ext === 'svg') return 'image/png';
  if (ext === 'heic' || ext === 'heif') return 'image/jpeg';
  if (ext === 'gif') return 'image/png';
  if (ext === 'avif') return 'image/png';
  if (ext === 'bmp') return 'image/png';
  return 'image/png';
}

interface ImageConverterToolProps {
  initialOutput?: string;
}

export default function ImageConverterTool({ initialOutput }: ImageConverterToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState(initialOutput || 'image/png');
  const [quality, setQuality] = useState(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasConverted, setHasConverted] = useState(false);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);
  const [convertedFormatExt, setConvertedFormatExt] = useState('png');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = (f: File | null) => {
    if (!f) return;
    const detected = detectInputFormat(f);
    setFile(f);
    setDetectedFormat(detected);
    const defaultOut = getDefaultOutputFormat(detected.ext, initialOutput);
    setTargetFormat(defaultOut);
    setHasConverted(false);
    setConvertedBlob(null);
    if (convertedPreview) URL.revokeObjectURL(convertedPreview);
    setConvertedPreview(null);
    setDimensions(null);

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    // Load dimensions
    if (!detected.isSvg) {
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      let canvas: HTMLCanvasElement;
      const detected = detectedFormat || detectInputFormat(file);

      if (detected.isSvg) {
        const text = await file.text();
        const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = svgUrl;
        });
        URL.revokeObjectURL(svgUrl);

        const scale = 2; // Crisp retina rasterization
        const targetW = Math.max(1, (img.naturalWidth || 800) * scale);
        const targetH = Math.max(1, (img.naturalHeight || 800) * scale);

        canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill white background for JPEG/BMP
        if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
      } else {
        const imgUrl = previewUrl || URL.createObjectURL(file);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = imgUrl;
        });

        canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Fill white background for non-alpha formats
        if (targetFormat === 'image/jpeg' || targetFormat === 'image/bmp') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
      }

      const q = targetFormat === 'image/png' || targetFormat === 'image/bmp' ? undefined : quality / 100;

      const blob = await new Promise<Blob | null>((res) => {
        canvas.toBlob(b => res(b), targetFormat, q);
      });

      if (!blob) {
        if (targetFormat === 'image/avif') {
          const fallbackBlob = await new Promise<Blob | null>((res) => {
            canvas.toBlob(b => res(b), 'image/webp', q);
          });
          if (fallbackBlob) {
            setConvertedBlob(fallbackBlob);
            setConvertedFormatExt('webp');
            if (convertedPreview) URL.revokeObjectURL(convertedPreview);
            setConvertedPreview(URL.createObjectURL(fallbackBlob));
            setHasConverted(true);
            toast.info('Browser does not support native AVIF encoding; exported as WebP instead');
            setIsProcessing(false);
            return;
          }
        }
        throw new Error('Canvas export produced empty blob');
      }

      const chosenFmt = OUTPUT_FORMATS.find(f => f.value === targetFormat);
      setConvertedBlob(blob);
      setConvertedFormatExt(chosenFmt?.ext || 'img');
      if (convertedPreview) URL.revokeObjectURL(convertedPreview);
      setConvertedPreview(URL.createObjectURL(blob));
      setHasConverted(true);
      toast.success(`Successfully converted to ${chosenFmt?.ext.toUpperCase() || 'new format'}!`);
    } catch (err) {
      console.error(err);
      toast.error('Format conversion failed. Please verify the image file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    downloadBlob(convertedBlob, `${base}.${convertedFormatExt}`);
  };

  const selectedOutput = OUTPUT_FORMATS.find(f => f.value === targetFormat) || OUTPUT_FORMATS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840, margin: '0 auto', width: '100%' }}>
      {/* Upload Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        style={{
          border: `2px dashed ${isDragging ? 'var(--brand)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: isDragging ? 'var(--brand-subtle)' : 'var(--color-surface)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.bmp,.ico,.gif,.avif,.tiff,.heic,.heif"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0] || null)}
        />
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
        }}>
          <RefreshCw size={24} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
          {file ? 'Change image or drop a new file' : 'Choose an image to change format'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
          JPG, PNG, WebP, AVIF, SVG, GIF, HEIC, BMP &bull; Auto-detects input &bull; 100% Client-Side
        </p>
      </div>

      {/* Main Workbench Area */}
      {file && detectedFormat && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!hasConverted ? (
            /* Configuration & Pre-Conversion State */
            <div
              className="card"
              style={{
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {/* Auto-detected Input Info */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                background: 'var(--color-surface2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                    border: '1px solid var(--color-border)'
                  }}>
                    {previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={previewUrl} alt="Input thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <FileImage size={20} style={{ color: 'var(--color-muted)' }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', wordBreak: 'break-all' }}>
                        {file.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                      <span>{formatFileSize(file.size)}</span>
                      {dimensions && <span>&bull; {dimensions.width} &times; {dimensions.height} px</span>}
                    </div>
                  </div>
                </div>

                {/* Auto-detected Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 }}>
                    Auto-Detected:
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-subtle)',
                    color: 'var(--brand-500)',
                    border: '1px solid var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <CheckCircle2 size={13} />
                    {detectedFormat.badge} ({detectedFormat.label})
                  </span>
                </div>
              </div>

              {/* Output Format Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                  Choose Output Format
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={targetFormat}
                    onChange={e => setTargetFormat(e.target.value)}
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 14px',
                      background: 'var(--color-surface2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text)',
                      fontSize: 14,
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {OUTPUT_FORMATS.map(fmt => (
                      <option key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Conversion:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                    {detectedFormat.badge}
                  </span>
                  <ArrowRight size={12} />
                  <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                    {selectedOutput.ext.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Quality slider for lossy target formats */}
              {!selectedOutput.isLossless && (
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--color-surface2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sliders size={15} style={{ color: 'var(--color-accent)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Output Quality</span>
                    </div>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>
                    <span>Smaller file</span>
                    <span>Higher fidelity</span>
                  </div>
                </div>
              )}

              {/* Convert Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleConvert}
                loading={isProcessing}
                style={{ height: 46, fontSize: 15, fontWeight: 700 }}
              >
                Change Format to {selectedOutput.ext.toUpperCase()}
              </Button>
            </div>
          ) : (
            /* Post-Conversion Output Card */
            <div
              className="card"
              style={{
                maxWidth: 480,
                width: '100%',
                margin: '0 auto',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              {/* Header Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700, padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)', background: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent)'
                }}>
                  <span>{detectedFormat.badge}</span>
                  <ArrowRight size={12} />
                  <span>{convertedFormatExt.toUpperCase()}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  Conversion Complete
                </span>
              </div>

              {/* Preview Thumbnail */}
              <div style={{
                width: '100%',
                height: 220,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--color-surface2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-border)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={convertedPreview || ''}
                  alt="Converted output"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* File details & Size Comparison */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)', textAlign: 'center', wordBreak: 'break-all' }}>
                  {file.name.substring(0, file.name.lastIndexOf('.')) || file.name}.{convertedFormatExt}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--color-surface2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>Original ({detectedFormat.badge})</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formatFileSize(file.size)}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--color-muted)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>Converted ({convertedFormatExt.toUpperCase()})</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                      {convertedBlob ? formatFileSize(convertedBlob.size) : '0 B'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Action */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleDownload}
                icon={<Download size={18} />}
                style={{ width: '100%', height: 46, fontSize: 15, fontWeight: 700 }}
              >
                Download {convertedFormatExt.toUpperCase()}
              </Button>

              {/* Re-adjust link */}
              <button
                onClick={() => setHasConverted(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-accent)',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'center',
                  textDecoration: 'underline',
                  padding: '4px 0',
                }}
              >
                Change format or re-convert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
