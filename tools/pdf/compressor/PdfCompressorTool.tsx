'use client';
import React, { useState, useRef } from 'react';
import { Download, FileText, AlertCircle, Sliders, Zap, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob } from '@/lib/utils';
import { PDFDocument } from 'pdf-lib';
import { getPdfJs } from '@/lib/pdfUtils';

type CompressionPreset = 'recommended' | 'extreme' | 'low' | 'custom';

export default function PdfCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

  // Options
  const [preset, setPreset] = useState<CompressionPreset>('recommended');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dpi, setDpi] = useState<number>(130);
  const [quality, setQuality] = useState<number>(0.72);
  const [grayscale, setGrayscale] = useState<boolean>(false);
  const [mode, setMode] = useState<'smart' | 'stream'>('smart');

  // Results
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF document.');
      return;
    }
    setError(null);
    setFile(f);
    setResultBlob(null);
    setResultSize(0);

    try {
      const buffer = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setPageCount(pdfDoc.getPageCount());
    } catch {
      setPageCount(1);
    }
  };

  const applyPreset = (p: CompressionPreset) => {
    setPreset(p);
    if (p === 'recommended') {
      setDpi(130);
      setQuality(0.72);
      setGrayscale(false);
      setMode('smart');
    } else if (p === 'extreme') {
      setDpi(96);
      setQuality(0.50);
      setGrayscale(false);
      setMode('smart');
    } else if (p === 'low') {
      setDpi(180);
      setQuality(0.85);
      setGrayscale(false);
      setMode('smart');
    }
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: pageCount, stage: 'Preparing document...' });

    try {
      const freshBuffer = await file.arrayBuffer();

      if (mode === 'stream') {
        // Stream optimization only (metadata stripping + object streams)
        setProgress({ current: 0, total: 1, stage: 'Optimizing internal object streams...' });
        const pdfDoc = await PDFDocument.load(freshBuffer, { ignoreEncryption: true });
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('whysogood compressor');
        pdfDoc.setCreator('whysogood');

        const compressedBytes = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          updateFieldAppearances: false,
        });

        const finalBytes = compressedBytes.length < file.size ? compressedBytes : new Uint8Array(freshBuffer);
        const outBlob = new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });
        setResultBlob(outBlob);
        setResultSize(outBlob.size);
      } else {
        // Smart Downsampling & Image Compression Algorithm
        const pdfjs = await getPdfJs();
        if (!pdfjs) throw new Error('PDF rendering engine not available.');

        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(freshBuffer).slice() });
        const sourcePdf = await loadingTask.promise;
        const totalPages = sourcePdf.numPages;

        const targetPdf = await PDFDocument.create();

        for (let i = 1; i <= totalPages; i++) {
          setProgress({ current: i, total: totalPages, stage: `Compressing page ${i} of ${totalPages}...` });

          const page = await sourcePdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1.0 });

          // Compute scale based on target DPI (base is 72 DPI)
          const scale = dpi / 72;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: ctx, viewport }).promise;

          // Convert to grayscale if requested
          if (grayscale) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let j = 0; j < data.length; j += 4) {
              const avg = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
              data[j] = avg;
              data[j + 1] = avg;
              data[j + 2] = avg;
            }
            ctx.putImageData(imgData, 0, 0);
          }

          // Compress to JPEG blob
          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
          if (!blob) continue;

          const jpgBytes = await blob.arrayBuffer();
          const embeddedImage = await targetPdf.embedJpg(jpgBytes);

          // Maintain original page physical dimensions in PDF points
          const newPage = targetPdf.addPage([baseViewport.width, baseViewport.height]);
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: baseViewport.width,
            height: baseViewport.height,
          });
        }

        setProgress({ current: totalPages, total: totalPages, stage: 'Finalizing compressed document...' });
        const compressedBytes = await targetPdf.save({ useObjectStreams: true });
        const outBlob = new Blob([compressedBytes as unknown as BlobPart], { type: 'application/pdf' });

        setResultBlob(outBlob);
        setResultSize(outBlob.size);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultBlob(null);
    setResultSize(0);
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0] || null)}
      />

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-1)',
            padding: '56px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-subtle)',
              color: 'var(--brand-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <FileText size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to compress
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; downsamples heavy images and optimizes streams directly in your browser
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-subtle)',
                  color: 'var(--brand-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                  {file.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
                  {formatFileSize(file.size)} &bull; {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              Change File
            </Button>
          </div>

          {/* Preset Selection Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              Compression Level:
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {[
                {
                  id: 'extreme',
                  title: 'Extreme Compression',
                  desc: 'Lowest file size. 96 DPI, 50% quality. Best for email and messaging limits.',
                  badge: '~80-90% smaller',
                },
                {
                  id: 'recommended',
                  title: 'Recommended (Balanced)',
                  desc: 'High quality reading with major size reduction. 130 DPI, 72% quality.',
                  badge: '~60-80% smaller',
                },
                {
                  id: 'low',
                  title: 'Low Compression',
                  desc: 'Maximum image clarity and sharp text. 180 DPI, 85% quality.',
                  badge: '~30-50% smaller',
                },
              ].map(item => {
                const isSelected = preset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyPreset(item.id as CompressionPreset)}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--brand)' : 'var(--border)',
                      background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-1)',
                      color: isSelected ? 'var(--brand)' : 'var(--ink)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</span>
                      <span
                        className="c-badge c-badge--pos"
                        style={{ fontSize: 10, padding: '1px 6px' }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.4 }}>
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced / Transparent Settings Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(s => !s)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--brand)',
                padding: 0,
              }}
            >
              <Sliders size={14} />
              {showAdvanced ? 'Hide Transparent Options' : 'Custom & Transparent Options'}
            </button>
          </div>

          {/* Transparent Options Panel */}
          {showAdvanced && (
            <div
              className="c-card"
              style={{
                padding: '18px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
              }}
            >
              {/* Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  Compression Mode:
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setMode('smart')}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: mode === 'smart' ? 'var(--brand)' : 'var(--bg-2)',
                      color: mode === 'smart' ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Smart Downsample
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('stream')}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: mode === 'stream' ? 'var(--brand)' : 'var(--bg-2)',
                      color: mode === 'stream' ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Lossless Stream
                  </button>
                </div>
              </div>

              {/* DPI */}
              {mode === 'smart' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        Target Resolution:
                      </label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>
                        {dpi} DPI
                      </span>
                    </div>
                    <input
                      type="range"
                      min="72"
                      max="240"
                      step="10"
                      value={dpi}
                      onChange={e => {
                        setDpi(parseInt(e.target.value, 10));
                        setPreset('custom');
                      }}
                      style={{ accentColor: 'var(--brand)' }}
                    />
                  </div>

                  {/* Quality */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        JPEG Quality:
                      </label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>
                        {Math.round(quality * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.30"
                      max="0.95"
                      step="0.05"
                      value={quality}
                      onChange={e => {
                        setQuality(parseFloat(e.target.value));
                        setPreset('custom');
                      }}
                      style={{ accentColor: 'var(--brand)' }}
                    />
                  </div>

                  {/* Grayscale Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      Color Mode:
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setGrayscale(false)}
                        className="c-btn c-btn--sm"
                        style={{
                          flex: 1,
                          background: !grayscale ? 'var(--brand)' : 'var(--bg-2)',
                          color: !grayscale ? '#fff' : 'var(--ink)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Keep Colors
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrayscale(true)}
                        className="c-btn c-btn--sm"
                        style={{
                          flex: 1,
                          background: grayscale ? 'var(--brand)' : 'var(--bg-2)',
                          color: grayscale ? '#fff' : 'var(--ink)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Grayscale (-40%)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div
              className="c-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                <span>{progress.stage}</span>
                {progress.total > 0 && (
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                )}
              </div>
              <div
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-2)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    height: '100%',
                    background: 'var(--brand)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--neg-subtle)',
                color: 'var(--neg)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Action / Compress Button */}
          {!resultBlob && (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                onClick={compressPdf}
                loading={isProcessing}
                disabled={isProcessing}
                icon={<Zap size={15} />}
              >
                {isProcessing ? 'Compressing PDF...' : 'Compress PDF'}
              </Button>
            </div>
          )}

          {/* Result Card */}
          {resultBlob && (
            <div
              className="c-card"
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                border: '1px solid var(--pos)',
                background: 'var(--bg-1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--pos)' }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    Compression Succeeded!
                  </span>
                </div>

                <span
                  className="c-badge c-badge--pos"
                  style={{ fontSize: 13, padding: '4px 12px' }}
                >
                  {resultSize < file.size
                    ? `-${calcReductionPct(file.size, resultSize)}% Smaller`
                    : 'Optimal Size'}
                </span>
              </div>

              {/* Size comparison numbers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 14,
                  padding: '12px 16px',
                  background: 'var(--bg-2)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Original Size</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    {formatFileSize(file.size)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Compressed Size</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--pos)' }}>
                    {formatFileSize(resultSize)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Space Saved</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)' }}>
                    {file.size > resultSize ? formatFileSize(file.size - resultSize) : '0 KB'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  onClick={() => downloadBlob(resultBlob, `compressed_${file.name}`)}
                  icon={<Download size={15} />}
                >
                  Download Compressed PDF
                </Button>

                <Button
                  variant="secondary"
                  icon={<RefreshCw size={14} />}
                  onClick={compressPdf}
                  disabled={isProcessing}
                >
                  Re-compress with Different Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
