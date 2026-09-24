'use client';
import React, { useState, useRef } from 'react';
import { Download, FileText, AlertCircle, Sliders, Zap, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob } from '@/lib/utils';
import { PDFDocument } from 'pdf-lib';
import { compressPdf, type PdfPreset, type PdfCompressResult, PDF_PRESETS } from '@/lib/pdfCompressor';

type CompressionPreset = 'recommended' | 'extreme' | 'low' | 'custom';

export default function PdfCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 100, stage: '' });

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
  const [compressResult, setCompressResult] = useState<PdfCompressResult | null>(null);
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
    setCompressResult(null);

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
    const config = PDF_PRESETS[p];
    if (config) {
      setDpi(config.dpi);
      setQuality(config.quality);
      setGrayscale(false);
    }
  };

  const compressPdfAction = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: 100, stage: 'Preparing document...' });

    try {
      const res = await compressPdf(file, {
        preset: mode === 'stream' ? undefined : preset,
        imageDpi: mode === 'stream' ? undefined : dpi,
        imageQuality: mode === 'stream' ? undefined : quality,
        grayscale,
        compressObjectStreams: true,
        onProgress: (pct, stage) => {
          setProgress({ current: pct, total: 100, stage: stage || 'Compressing PDF...' });
        },
      });

      setCompressResult(res);
      setResultBlob(res.blob);
      setResultSize(res.compressedSize);
      if (res.pageCount > 0) {
        setPageCount(res.pageCount);
      }
    } catch (err: unknown) {
      // Safety tier guarantee: Never break UI state
      const fallbackBlob = file;
      const fallbackResult: PdfCompressResult = {
        blob: fallbackBlob,
        originalSize: file.size,
        compressedSize: file.size,
        reductionPercentage: 0,
        reductionFormatted: '0%',
        pageCount: pageCount || 1,
        status: 'fallback',
        tierUsed: 3,
        statusMessage: err instanceof Error ? err.message : 'Original PDF preserved safely',
      };
      setCompressResult(fallbackResult);
      setResultBlob(fallbackBlob);
      setResultSize(file.size);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultBlob(null);
    setResultSize(0);
    setCompressResult(null);
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
                onClick={compressPdfAction}
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
                border: compressResult?.status === 'compressed' ? '1px solid var(--pos)' : '1px solid var(--border)',
                background: 'var(--bg-1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {compressResult?.status === 'compressed' ? (
                    <CheckCircle2 size={20} style={{ color: 'var(--pos)' }} />
                  ) : compressResult?.status === 'encrypted' || compressResult?.status === 'corrupted' ? (
                    <ShieldAlert size={20} style={{ color: 'var(--warn, #eab308)' }} />
                  ) : (
                    <ShieldCheck size={20} style={{ color: 'var(--brand)' }} />
                  )}
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    {compressResult?.status === 'compressed'
                      ? 'Compression Succeeded!'
                      : compressResult?.status === 'optimal'
                      ? 'Document Already Optimal'
                      : compressResult?.status === 'encrypted'
                      ? 'Password-Protected PDF Preserved'
                      : compressResult?.status === 'corrupted'
                      ? 'Unreadable PDF Preserved Safely'
                      : 'Document Preserved Safely'}
                  </span>
                </div>

                <span
                  className={`c-badge ${compressResult?.status === 'compressed' ? 'c-badge--pos' : 'c-badge--brand'}`}
                  style={{ fontSize: 13, padding: '4px 12px' }}
                >
                  {compressResult?.status === 'compressed'
                    ? `-${compressResult.reductionFormatted} Smaller (Tier ${compressResult.tierUsed})`
                    : compressResult?.status === 'optimal'
                    ? 'Already Optimal (0%)'
                    : compressResult?.status === 'encrypted'
                    ? 'Encrypted (Safe Pass-through)'
                    : compressResult?.status === 'corrupted'
                    ? 'Corrupted (Safe Pass-through)'
                    : 'Safe Fallback'}
                </span>
              </div>

              {compressResult?.statusMessage && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)' }}>
                  {compressResult.statusMessage}
                </p>
              )}

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
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Output Size</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: compressResult?.status === 'compressed' ? 'var(--pos)' : 'var(--ink)' }}>
                    {formatFileSize(resultSize)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Space Saved</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)' }}>
                    {file.size > resultSize ? formatFileSize(file.size - resultSize) : '0 B'}
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
                  onClick={compressPdfAction}
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
