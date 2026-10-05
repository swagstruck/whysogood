'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Image as ImageIcon, Download, AlertCircle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { getPdfJs, createZipArchive } from '@/lib/pdfUtils';

interface RenderedPage {
  pageNumber: number;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Robustly renders a single PDF page to a PNG blob.
 *
 * Key correctness measures:
 *  1. `data` is copied fresh per render call – avoids ArrayBuffer detachment
 *     that happens when the same buffer is transferred to the PDF.js worker.
 *  2. Background fill is controlled by the `transparent` flag.
 *  3. After `page.render().promise` we yield one microtask tick via
 *     `createImageBitmap()` which acts as a GPU compositing flush, ensuring
 *     the rasterised pixels are committed to the canvas before `toBlob()`.
 *  4. Canvas dimensions are set *before* rendering (PDF.js requirement).
 */
async function renderPageToPng(
  fileData: Uint8Array,
  pageNumber: number,
  scale: number,
  transparent: boolean,
): Promise<RenderedPage> {
  const pdfjs = await getPdfJs();

  // Fresh copy per call – prevents the previous getDocument() transfer from
  // detaching this buffer when the worker receives it.
  const safeCopy = fileData.slice();
  const doc = await pdfjs.getDocument({ data: safeCopy }).promise;
  const page = await doc.getPage(pageNumber);

  const viewport = page.getViewport({ scale });

  // Guard against unreasonably large canvases (browser limit ~16,384px per edge)
  const MAX_PX = 8192;
  const clampedScale =
    viewport.width > MAX_PX || viewport.height > MAX_PX
      ? Math.min(MAX_PX / viewport.width, MAX_PX / viewport.height) * scale
      : scale;
  const finalViewport =
    clampedScale !== scale ? page.getViewport({ scale: clampedScale }) : viewport;

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(finalViewport.width);
  canvas.height = Math.floor(finalViewport.height);

  const ctx = canvas.getContext('2d', { alpha: transparent });
  if (!ctx) throw new Error(`Canvas 2D context unavailable for page ${pageNumber}`);

  if (!transparent) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const renderTask = page.render({ canvasContext: ctx, viewport: finalViewport });
  await renderTask.promise;

  // Flush compositing pipeline: createImageBitmap forces the browser to
  // commit all pending canvas draw calls before we snapshot with toBlob().
  try {
    const bmp = await createImageBitmap(canvas);
    bmp.close();
  } catch {
    // Older Safari: fall back to a single rAF tick
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  // Snapshot
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error(`toBlob returned null for page ${pageNumber}`))),
      'image/png',
    );
  });

  const dataUrl = canvas.toDataURL('image/png');

  // Release the page resources
  page.cleanup();
  await doc.destroy();

  return { pageNumber, blob, dataUrl, width: canvas.width, height: canvas.height };
}

export default function PdfToPngTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [dpi, setDpi] = useState<number>(150);
  const [transparent, setTransparent] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [renderedImages, setRenderedImages] = useState<RenderedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stable reference to file bytes – read once, reused safely via .slice()
  const fileBytesRef = useRef<Uint8Array | null>(null);

  const handleFile = useCallback(async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }
    setError(null);
    setFile(f);
    setRenderedImages([]);
    fileBytesRef.current = null;

    try {
      // Read bytes once up-front; store as Uint8Array so subsequent renders
      // can do a safe .slice() without re-reading the File object.
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      fileBytesRef.current = bytes;

      const pdfjs = await getPdfJs();
      if (!pdfjs) throw new Error('PDF.js renderer not available.');
      // Use a fresh copy so the page-count doc doesn't consume the only copy
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      setPageCount(doc.numPages);
      await doc.destroy();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF.');
    }
  }, []);

  const convertToPng = useCallback(async () => {
    if (!file || !fileBytesRef.current) return;
    setIsConverting(true);
    setError(null);
    setRenderedImages([]);
    setProgress({ current: 0, total: pageCount });

    const images: RenderedPage[] = [];
    const scale = dpi / 72; // PDF base DPI = 72

    try {
      for (let i = 1; i <= pageCount; i++) {
        setProgress({ current: i, total: pageCount });
        // Each call gets its own fresh copy via .slice() inside renderPageToPng
        const rendered = await renderPageToPng(fileBytesRef.current, i, scale, transparent);
        images.push(rendered);
        // Show pages as they complete (streaming preview)
        setRenderedImages(prev => [...prev, rendered]);
      }

      const baseName = file.name.replace(/\.pdf$/i, '');
      if (images.length === 1) {
        downloadBlob(images[0].blob, `${baseName}_page_1.png`);
      } else {
        const filesMap: Record<string, Blob> = {};
        for (const item of images) {
          filesMap[`${baseName}_page_${item.pageNumber}.png`] = item.blob;
        }
        const zipBlob = await createZipArchive(filesMap);
        downloadBlob(zipBlob, `${baseName}_png_images.zip`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to PNG.');
    } finally {
      setIsConverting(false);
    }
  }, [file, pageCount, dpi, transparent]);

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setRenderedImages([]);
    setError(null);
    fileBytesRef.current = null;
  };

  const dpiOptions = [
    { label: '72 — Web', val: 72 },
    { label: '150 — Normal', val: 150 },
    { label: '300 — Print', val: 300 },
  ];

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
        /* ── Drop Zone ── */
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
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
            <ImageIcon size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to convert to PNG
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; renders crisp, lossless PNG images for each page
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ── File Header ── */}
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
                  {formatFileSize(file.size)} &bull; {pageCount}{' '}
                  {pageCount === 1 ? 'page' : 'pages'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              Choose Another PDF
            </Button>
          </div>

          {/* ── Options ── */}
          <div
            className="c-card"
            style={{
              padding: '18px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {/* DPI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Resolution (DPI):
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {dpiOptions.map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDpi(item.val)}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: dpi === item.val ? 'var(--brand)' : 'var(--bg-2)',
                      color: dpi === item.val ? '#fff' : 'var(--ink)',
                      border: `1px solid ${dpi === item.val ? 'var(--brand)' : 'var(--border)'}`,
                      fontWeight: dpi === item.val ? 700 : 500,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Background:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setTransparent(false)}
                  className="c-btn c-btn--sm"
                  style={{
                    flex: 1,
                    background: !transparent ? 'var(--brand)' : 'var(--bg-2)',
                    color: !transparent ? '#fff' : 'var(--ink)',
                    border: `1px solid ${!transparent ? 'var(--brand)' : 'var(--border)'}`,
                    fontWeight: !transparent ? 700 : 500,
                  }}
                >
                  White
                </button>
                <button
                  type="button"
                  onClick={() => setTransparent(true)}
                  className="c-btn c-btn--sm"
                  style={{
                    flex: 1,
                    background: transparent ? 'var(--brand)' : 'var(--bg-2)',
                    color: transparent ? '#fff' : 'var(--ink)',
                    border: `1px solid ${transparent ? 'var(--brand)' : 'var(--border)'}`,
                    fontWeight: transparent ? 700 : 500,
                  }}
                >
                  Transparent
                </button>
              </div>
              {transparent && (
                <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>
                  PNG supports transparency — text/lines will render over a clear background.
                </p>
              )}
            </div>
          </div>

          {/* ── Preview Gallery (streaming — shows pages as they complete) ── */}
          {renderedImages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  Converted Pages
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ink-2)',
                      background: 'var(--bg-2)',
                      padding: '2px 8px',
                      borderRadius: 99,
                    }}
                  >
                    {renderedImages.length} / {pageCount} PNG
                  </span>
                </span>
                {renderedImages.length === pageCount && renderedImages.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={13} />}
                    onClick={async () => {
                      const baseName = file.name.replace(/\.pdf$/i, '');
                      const filesMap: Record<string, Blob> = {};
                      for (const img of renderedImages) {
                        filesMap[`${baseName}_page_${img.pageNumber}.png`] = img.blob;
                      }
                      const zipBlob = await createZipArchive(filesMap);
                      downloadBlob(zipBlob, `${baseName}_png_images.zip`);
                    }}
                  >
                    Download All (ZIP)
                  </Button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 14,
                }}
              >
                {renderedImages.map(img => (
                  <div
                    key={img.pageNumber}
                    className="c-card"
                    style={{
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    {/* Checkered bg pattern shows transparency */}
                    <div
                      style={{
                        background: transparent
                          ? 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 0 0 / 12px 12px'
                          : '#fff',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        minHeight: 120,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 160,
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                        Page {img.pageNumber}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Download size={12} />}
                        onClick={() =>
                          downloadBlob(
                            img.blob,
                            `${file.name.replace(/\.pdf$/i, '')}_page_${img.pageNumber}.png`,
                          )
                        }
                      >
                        PNG
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Placeholder cards for in-progress pages */}
                {isConverting &&
                  Array.from({ length: pageCount - renderedImages.length }).map((_, idx) => (
                    <div
                      key={`loading-${idx}`}
                      className="c-card"
                      style={{
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        alignItems: 'center',
                        minHeight: 180,
                        justifyContent: 'center',
                        opacity: 0.5,
                      }}
                    >
                      <Loader2
                        size={24}
                        style={{
                          animation: 'spin 1s linear infinite',
                          color: 'var(--ink-3)',
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        Page {renderedImages.length + idx + 1}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
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

          {/* ── Action Bar ── */}
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
              {isConverting ? (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  Rendering page {progress.current} of {progress.total}…
                </span>
              ) : renderedImages.length === pageCount && pageCount > 0 ? (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--pos)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={16} />
                  {pageCount} {pageCount === 1 ? 'page' : 'pages'} converted successfully
                </span>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  Convert {pageCount} {pageCount === 1 ? 'page' : 'pages'} &rarr; PNG at{' '}
                  {dpi} DPI
                </span>
              )}
            </div>

            <Button
              onClick={convertToPng}
              loading={isConverting}
              disabled={isConverting || pageCount === 0}
              icon={<Download size={15} />}
            >
              {isConverting
                ? `Converting (${progress.current}/${progress.total})…`
                : renderedImages.length === pageCount && pageCount > 0
                ? 'Re-convert'
                : pageCount === 1
                ? 'Convert & Download PNG'
                : 'Convert & Download All (ZIP)'}
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
