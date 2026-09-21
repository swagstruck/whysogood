'use client';
import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { Stamp, Download, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { getPdfJs } from '@/lib/pdfUtils';

export default function PdfWatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(45);
  const [colorHex, setColorHex] = useState('#ef4444');
  const [pageTarget, setPageTarget] = useState<'all' | 'odd' | 'even'>('all');
  const [firstPagePreview, setFirstPagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    setError(null);
    setFile(f);

    try {
      const buffer = await f.arrayBuffer();
      const pdfjs = await getPdfJs();
      if (!pdfjs) throw new Error('PDF.js renderer not available.');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer).slice() }).promise;
      setPageCount(doc.numPages);

      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        setFirstPagePreview(canvas.toDataURL('image/jpeg', 0.8));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PDF file.');
    }
  };

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    return { r, g, b };
  };

  const applyWatermark = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      const { r, g, b } = hexToRgb(colorHex);

      pages.forEach((page, idx) => {
        const pageNum = idx + 1;
        if (pageTarget === 'odd' && pageNum % 2 === 0) return;
        if (pageTarget === 'even' && pageNum % 2 !== 0) return;

        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        // Center calculation with angle
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const x = width / 2 - (textWidth / 2) * cos + (textHeight / 2) * sin;
        const y = height / 2 - (textWidth / 2) * sin - (textHeight / 2) * cos;

        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(rotation),
        });
      });

      const bytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.pdf$/i, '');
      downloadBlob(blob, `${baseName}_watermarked.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setFirstPagePreview(null);
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
            <Stamp size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to add watermark
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; stamp text watermarks with custom rotation, opacity, and color
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
              Choose Another PDF
            </Button>
          </div>

          {/* Controls + Live Preview Side by Side */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20,
            }}
          >
            {/* Options Column */}
            <div className="c-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  Watermark Text:
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={e => setWatermarkText(e.target.value)}
                  className="c-field__input"
                  style={{ height: 38 }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE'].map(sample => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setWatermarkText(sample)}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '3px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--ink-2)',
                        cursor: 'pointer',
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Rotation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                      Size:
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fontSize}pt</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="96"
                    value={fontSize}
                    onChange={e => setFontSize(parseInt(e.target.value, 10))}
                    style={{ accentColor: 'var(--brand)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                      Rotation:
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={rotation}
                    onChange={e => setRotation(parseInt(e.target.value, 10))}
                    style={{ accentColor: 'var(--brand)' }}
                  />
                </div>
              </div>

              {/* Opacity & Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                      Opacity:
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={e => setOpacity(parseFloat(e.target.value))}
                    style={{ accentColor: 'var(--brand)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                    Color:
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={colorHex}
                      onChange={e => setColorHex(e.target.value)}
                      style={{
                        width: 32,
                        height: 32,
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['#ef4444', '#64748b', '#3b82f6', '#000000'].map(c => (
                        <span
                          key={c}
                          onClick={() => setColorHex(c)}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            border: colorHex === c ? '2px solid var(--brand)' : '1px solid var(--border)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Pages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  Apply to Pages:
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: 'All Pages', val: 'all' },
                    { label: 'Odd Only', val: 'odd' },
                    { label: 'Even Only', val: 'even' },
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setPageTarget(item.val as any)}
                      className="c-btn c-btn--sm"
                      style={{
                        flex: 1,
                        background: pageTarget === item.val ? 'var(--brand)' : 'var(--bg-2)',
                        color: pageTarget === item.val ? '#fff' : 'var(--ink)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Visual Preview Column */}
            <div
              className="c-card"
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'var(--bg-1)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>
                Live Preview (Page 1)
              </span>

              <div
                style={{
                  position: 'relative',
                  maxWidth: 260,
                  maxHeight: 340,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                }}
              >
                {firstPagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firstPagePreview}
                    alt="Page 1 preview"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                )}

                {/* Overlaid simulated text */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    color: colorHex,
                    opacity: opacity,
                    fontSize: fontSize * 0.45, // scaled for thumbnail viewport
                    fontWeight: 800,
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    letterSpacing: '0.05em',
                  }}
                >
                  {watermarkText || 'WATERMARK'}
                </div>
              </div>
            </div>
          </div>

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

          {/* Action Bar */}
          <div
            className="c-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                Watermark ready for {pageTarget === 'all' ? `all ${pageCount}` : pageTarget} pages
              </span>
            </div>

            <Button
              onClick={applyWatermark}
              loading={isProcessing}
              disabled={isProcessing || !watermarkText.trim()}
              icon={<Download size={15} />}
            >
              {isProcessing ? 'Watermarking PDF...' : 'Apply Watermark & Download'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
