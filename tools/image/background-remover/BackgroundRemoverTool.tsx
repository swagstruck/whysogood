'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RefreshCw, X, Sparkles, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';

type Stage =
  | 'idle'
  | 'loading'
  | 'initializing'
  | 'processing'
  | 'done'
  | 'error';

type BgOption = 'transparent' | 'white' | 'black' | 'custom';

const CHECKERBOARD_CSS = `
  repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 20px 20px
`;
const CHECKERBOARD_CSS_LIGHT = `
  repeating-conic-gradient(#d0d0d0 0% 25%, #f5f5f5 0% 50%) 0 0 / 20px 20px
`;

const STAGE_MESSAGES: Record<Stage, string> = {
  idle: '',
  loading: 'Loading image…',
  initializing: 'Initializing AI model (first run may take ~10s)…',
  processing: 'Removing background…',
  done: 'Done!',
  error: '',
};

export default function BackgroundRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [bgOption, setBgOption] = useState<BgOption>('transparent');
  const [customColor, setCustomColor] = useState('#ffffff');
  const [isDragging, setIsDragging] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, []);

  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/') && !f.name.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i)) {
      setError('Please select a valid image file (JPG, PNG, WebP, GIF, BMP).');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('Image must be smaller than 20 MB.');
      return;
    }

    setFile(f);
    setError(null);
    setResultBlob(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setStage('idle');
    setProgress(0);
    setShowComparison(false);

    const url = URL.createObjectURL(f);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(url);
  }, [originalUrl, resultUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const removeBackground = async () => {
    if (!file) return;
    setStage('initializing');
    setError(null);
    setProgress(0);

    try {
      // Dynamically import to avoid SSR issues
      const { removeBackground: removeBg } = await import('@imgly/background-removal');

      setStage('processing');

      const resultBlob = await removeBg(file, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setProgress(pct);
          }
        },
        // Use the quantized model — smallest (~5 MB) and fastest
        model: 'isnet_quint8',
      });

      const url = URL.createObjectURL(resultBlob);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(url);
      setResultBlob(resultBlob);
      setStage('done');
    } catch (err: unknown) {
      console.error('Background removal failed:', err);
      setError(
        err instanceof Error
          ? `Failed: ${err.message}`
          : 'Background removal failed. Please try another image.'
      );
      setStage('error');
    }
  };

  const getEffectiveResultUrl = (): string | null => {
    if (!resultBlob) return null;
    if (bgOption === 'transparent') return resultUrl;

    // Compose onto background color
    const color = bgOption === 'custom' ? customColor : bgOption === 'white' ? '#ffffff' : '#000000';

    // We'll return the stored result URL and apply CSS background; compositing on canvas is done at download time
    return resultUrl;
  };

  const handleDownload = async () => {
    if (!resultBlob || !file) return;
    const baseName = file.name.replace(/\.[^.]+$/, '');

    if (bgOption === 'transparent') {
      downloadBlob(resultBlob, `${baseName}_no_bg.png`);
      return;
    }

    // Composite onto chosen background color
    const color = bgOption === 'custom' ? customColor : bgOption === 'white' ? '#ffffff' : '#000000';

    const img = new Image();
    img.src = URL.createObjectURL(resultBlob);
    await new Promise<void>(res => { img.onload = () => res(); });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);

    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, `${baseName}_no_bg.png`);
    }, 'image/png');
  };

  const reset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setOriginalUrl(null);
    setResultBlob(null);
    setResultUrl(null);
    setStage('idle');
    setError(null);
    setProgress(0);
    setShowComparison(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isProcessing = stage === 'initializing' || stage === 'processing' || stage === 'loading';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
      />

      {/* ── Beta notice ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 18px', borderRadius: 'var(--radius-md)',
        background: 'var(--warn-subtle)', border: '1px solid var(--warn)',
      }}>
        <Sparkles size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--warn)' }}>Beta Feature</span>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Background removal runs a lightweight AI model entirely in your browser — no data is uploaded to any server.
            Results may vary with complex backgrounds. First use may take a few seconds to download the AI model (~5 MB, cached locally).
          </p>
        </div>
      </div>

      {/* ── Drop Zone ───────────────────────────────────────────────── */}
      {!file && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? 'var(--brand)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            background: isDragging ? 'var(--brand-subtle)' : 'var(--bg-1)',
            padding: '56px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-base)',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-2)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Upload size={24} style={{ color: 'var(--ink-2)' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
            Drop your image here
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 20px' }}>
            JPG, PNG, WebP, GIF — up to 20 MB
          </p>
          <Button variant="primary" size="sm">Choose Image</Button>
        </div>
      )}

      {/* ── Main tool area ───────────────────────────────────────────── */}
      {file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* File info bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-1)', border: '1px solid var(--border)',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ImageIcon size={16} style={{ color: 'var(--ink-2)' }} />
              <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, wordBreak: 'break-all' }}>{file.name}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{formatFileSize(file.size)}</span>
            </div>
            <button
              onClick={reset}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>

          {/* Preview area */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: stage === 'done' ? '1fr 1fr' : '1fr',
            gap: 16,
          }}>
            {/* Original */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Original
              </p>
              <div style={{
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                border: '1px solid var(--border)', aspectRatio: '1 / 1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-2)',
              }}>
                {originalUrl && (
                  <img
                    src={originalUrl}
                    alt="Original"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                  />
                )}
              </div>
            </div>

            {/* Result */}
            {stage === 'done' && resultUrl && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Background Removed
                </p>
                <div style={{
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  border: '1px solid var(--border)', aspectRatio: '1 / 1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bgOption === 'transparent'
                    ? CHECKERBOARD_CSS
                    : bgOption === 'white' ? '#ffffff'
                    : bgOption === 'black' ? '#000000'
                    : customColor,
                }}>
                  <img
                    src={resultUrl}
                    alt="Result"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Processing progress */}
          {isProcessing && (
            <div style={{
              padding: '20px 24px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                justifyContent: 'center', marginBottom: 14,
              }}>
                <div className="animate-spin" style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2px solid var(--border)', borderTopColor: 'var(--brand)',
                }} />
                <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                  {STAGE_MESSAGES[stage]}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{
                height: 6, borderRadius: 99, background: 'var(--bg-3)',
                overflow: 'hidden', maxWidth: 320, margin: '0 auto',
              }}>
                <div style={{
                  height: '100%',
                  width: stage === 'initializing' ? '30%' : `${progress}%`,
                  background: 'var(--brand)',
                  borderRadius: 99,
                  transition: 'width 0.3s ease',
                  animation: stage === 'initializing' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }} />
              </div>
              {stage === 'processing' && progress > 0 && (
                <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '8px 0 0' }}>
                  {progress}%
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {stage === 'error' && error && (
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius-md)',
              background: 'var(--neg-subtle)', border: '1px solid var(--neg)',
              fontSize: 14, color: 'var(--neg)',
            }}>
              {error}
            </div>
          )}

          {/* Success + Options */}
          {stage === 'done' && (
            <div style={{
              padding: '18px 20px', borderRadius: 'var(--radius-md)',
              background: 'var(--pos-subtle)', border: '1px solid var(--pos)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle size={16} style={{ color: 'var(--pos)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                Background removed successfully!
              </span>
            </div>
          )}

          {/* Background color options (only shown after result) */}
          {stage === 'done' && (
            <div style={{
              padding: '18px 20px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-1)', border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '0 0 14px' }}>
                Background Color
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { value: 'transparent' as BgOption, label: 'Transparent', color: 'checkerboard' },
                  { value: 'white' as BgOption, label: 'White', color: '#ffffff' },
                  { value: 'black' as BgOption, label: 'Black', color: '#000000' },
                  { value: 'custom' as BgOption, label: 'Custom', color: customColor },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBgOption(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${bgOption === opt.value ? 'var(--brand)' : 'var(--border)'}`,
                      background: bgOption === opt.value ? 'var(--brand-subtle)' : 'var(--bg-2)',
                      cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
                      fontWeight: bgOption === opt.value ? 600 : 400,
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: '1px solid rgba(0,0,0,0.1)',
                      background: opt.color === 'checkerboard'
                        ? CHECKERBOARD_CSS_LIGHT
                        : opt.color,
                    }} />
                    {opt.label}
                  </button>
                ))}
                {bgOption === 'custom' && (
                  <input
                    type="color"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }}
                    title="Pick custom color"
                  />
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {stage !== 'done' && !isProcessing && (
              <Button
                variant="primary"
                onClick={removeBackground}
                disabled={isProcessing}
                style={{ gap: 8, display: 'flex', alignItems: 'center' }}
              >
                <Sparkles size={15} />
                Remove Background
              </Button>
            )}

            {stage === 'done' && (
              <>
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  style={{ gap: 8, display: 'flex', alignItems: 'center' }}
                >
                  <Download size={15} />
                  Download PNG
                </Button>
                <Button
                  variant="secondary"
                  onClick={removeBackground}
                  style={{ gap: 8, display: 'flex', alignItems: 'center' }}
                >
                  <RefreshCw size={14} />
                  Reprocess
                </Button>
              </>
            )}

            {stage === 'error' && (
              <Button
                variant="primary"
                onClick={removeBackground}
                style={{ gap: 8, display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={14} />
                Retry
              </Button>
            )}

            <Button variant="ghost" onClick={reset}>
              Start Over
            </Button>
          </div>

          {/* Tips */}
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-1)', border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', margin: '0 0 8px' }}>
              💡 Tips for best results
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.7 }}>
              <li>Works best on portraits and product images with distinct subjects</li>
              <li>High contrast between subject and background improves accuracy</li>
              <li>Download as PNG to preserve transparency</li>
              <li>First use downloads the AI model (~5 MB) — subsequent uses are instant</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
