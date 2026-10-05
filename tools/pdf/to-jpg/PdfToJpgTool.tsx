'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Image as ImageIcon,
  Download,
  AlertCircle,
  FileText,
  CheckCircle2,
  Loader2,
  ZapIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { getPdfJs, createZipArchive } from '@/lib/pdfUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageState {
  pageNumber: number;
  /** low-res thumbnail shown immediately after upload */
  thumbDataUrl: string | null;
  /** full-quality blob produced only when user requests download */
  blob: Blob | null;
  /** true while this individual page is being converted */
  converting: boolean;
}

// ─── Canvas rendering helpers ─────────────────────────────────────────────────

/**
 * Render a PDF page from an already-loaded PDFDocumentProxy.
 * Returns a jpeg dataUrl (thumbnail) or a Blob (for download).
 *
 * KEY FIX: We keep a single PDFDocumentProxy alive in a ref and always
 * call doc.getPage() from that one instance.  Never load getDocument()
 * more than once per file — doing so re-transfers the ArrayBuffer to the
 * worker and the old handle becomes detached / returns blank pixels.
 */
async function renderPageOnCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // Clamp canvas size to avoid silent failure at very high DPI on large pages
  const MAX_PX = 8192;
  const safeScale =
    viewport.width > MAX_PX || viewport.height > MAX_PX
      ? Math.min(MAX_PX / viewport.width, MAX_PX / viewport.height) * scale
      : scale;
  const vp = safeScale !== scale ? page.getViewport({ scale: safeScale }) : viewport;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);

  // alpha:false → pre-multiplied white background, required for JPEG
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error(`Canvas 2D context unavailable (page ${pageNumber})`);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  // GPU flush: forces browser to commit all composited pixels before toBlob
  try {
    const bmp = await createImageBitmap(canvas);
    bmp.close();
  } catch {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
  }

  page.cleanup();
  return canvas;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PdfToJpgTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.85);
  const [pages, setPages] = useState<PageState[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [thumbProgress, setThumbProgress] = useState({ current: 0, total: 0 });
  const [bulkConverting, setBulkConverting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // The single live PDFDocumentProxy — never re-created for the same file
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = useRef<any>(null);

  // Destroy the old document when component unmounts or file changes
  const destroyDoc = useCallback(async () => {
    if (docRef.current) {
      try { await docRef.current.destroy(); } catch { /* ignore */ }
      docRef.current = null;
    }
  }, []);

  useEffect(() => { return () => { destroyDoc(); }; }, [destroyDoc]);

  // ── Load file & render thumbnails ──────────────────────────────────────────
  const handleFile = useCallback(async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
      return;
    }

    await destroyDoc();
    setError(null);
    setFile(f);
    setPages([]);
    setLoadingThumbs(true);
    setPageCount(0);

    try {
      const pdfjs = await getPdfJs();
      if (!pdfjs) throw new Error('PDF.js not available.');

      // Read once — PDF.js transfers this buffer to its worker.
      // After this call docRef.current owns the document; we never re-read f.arrayBuffer().
      const buffer = await f.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      docRef.current = doc;

      const numPages: number = doc.numPages;
      setPageCount(numPages);

      // Initialise placeholder states so the grid renders immediately
      setPages(
        Array.from({ length: numPages }, (_, i) => ({
          pageNumber: i + 1,
          thumbDataUrl: null,
          blob: null,
          converting: false,
        })),
      );
      setThumbProgress({ current: 0, total: numPages });

      // Render thumbnails sequentially (low DPI = fast, small)
      const THUMB_SCALE = 0.4; // ~108px wide for a standard A4 page
      for (let i = 1; i <= numPages; i++) {
        setThumbProgress({ current: i, total: numPages });
        const canvas = await renderPageOnCanvas(doc, i, THUMB_SCALE);
        const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setPages(prev =>
          prev.map(p =>
            p.pageNumber === i ? { ...p, thumbDataUrl } : p,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF.');
    } finally {
      setLoadingThumbs(false);
    }
  }, [destroyDoc]);

  // ── Convert a single page → Blob ──────────────────────────────────────────
  const convertOnePage = useCallback(
    async (pageNumber: number): Promise<Blob> => {
      const doc = docRef.current;
      if (!doc) throw new Error('PDF document not loaded.');
      const scale = dpi / 72;
      const canvas = await renderPageOnCanvas(doc, pageNumber, scale);
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b =>
            b
              ? resolve(b)
              : reject(new Error(`toBlob returned null (page ${pageNumber})`)),
          'image/jpeg',
          quality,
        );
      });
    },
    [dpi, quality],
  );

  // ── Individual page download ───────────────────────────────────────────────
  const downloadPage = useCallback(
    async (pageNumber: number) => {
      setPages(prev =>
        prev.map(p => (p.pageNumber === pageNumber ? { ...p, converting: true } : p)),
      );
      try {
        const blob = await convertOnePage(pageNumber);
        const baseName = file!.name.replace(/\.pdf$/i, '');
        downloadBlob(blob, `${baseName}_page_${pageNumber}.jpg`);
        setPages(prev =>
          prev.map(p =>
            p.pageNumber === pageNumber ? { ...p, blob, converting: false } : p,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to convert page ${pageNumber}.`);
        setPages(prev =>
          prev.map(p => (p.pageNumber === pageNumber ? { ...p, converting: false } : p)),
        );
      }
    },
    [convertOnePage, file],
  );

  // ── Bulk convert & ZIP download ────────────────────────────────────────────
  const convertAll = useCallback(async () => {
    if (!file || !docRef.current) return;
    setBulkConverting(true);
    setBulkProgress({ current: 0, total: pageCount });
    setError(null);

    const baseName = file.name.replace(/\.pdf$/i, '');
    const filesMap: Record<string, Blob> = {};
    const blobs: { pageNumber: number; blob: Blob }[] = [];

    try {
      for (let i = 1; i <= pageCount; i++) {
        setBulkProgress({ current: i, total: pageCount });
        const blob = await convertOnePage(i);
        blobs.push({ pageNumber: i, blob });
        filesMap[`${baseName}_page_${i}.jpg`] = blob;

        // Update the card to show it's been converted
        setPages(prev =>
          prev.map(p => (p.pageNumber === i ? { ...p, blob } : p)),
        );
      }

      if (pageCount === 1) {
        downloadBlob(blobs[0].blob, `${baseName}_page_1.jpg`);
      } else {
        const zipBlob = await createZipArchive(filesMap);
        downloadBlob(zipBlob, `${baseName}_jpg_images.zip`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setBulkConverting(false);
    }
  }, [file, pageCount, convertOnePage]);

  const reset = useCallback(async () => {
    await destroyDoc();
    setFile(null);
    setPageCount(0);
    setPages([]);
    setError(null);
    setLoadingThumbs(false);
    setBulkConverting(false);
  }, [destroyDoc]);

  const dpiOptions = [
    { label: '72 — Web', val: 72 },
    { label: '150 — Normal', val: 150 },
    { label: '300 — Print', val: 300 },
  ];

  const allConverted = pages.length > 0 && pages.every(p => p.blob !== null);
  const thumbsDone = !loadingThumbs && pages.length > 0;

  // ─────────────────────────────────────────────────────────────────────────

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
            padding: '64px 24px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 56, height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-subtle)',
              color: 'var(--brand-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ImageIcon size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to convert to JPG
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            Drop PDF here &bull; each page becomes a high-quality JPEG image
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── File Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--brand-subtle)', color: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{file.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
                  {formatFileSize(file.size)} &bull; {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                  {loadingThumbs && (
                    <span style={{ marginLeft: 8, color: 'var(--brand)' }}>
                      — loading previews {thumbProgress.current}/{thumbProgress.total}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>Choose Another PDF</Button>
          </div>

          {/* ── Options ── */}
          <div
            className="c-card"
            style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}
          >
            {/* DPI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Image Resolution (DPI):
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {dpiOptions.map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setDpi(opt.val)}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: dpi === opt.val ? 'var(--brand)' : 'var(--bg-2)',
                      color: dpi === opt.val ? '#fff' : 'var(--ink)',
                      border: `1px solid ${dpi === opt.val ? 'var(--brand)' : 'var(--border)'}`,
                      fontWeight: dpi === opt.val ? 700 : 500,
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>JPEG Quality:</label>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range" min="0.5" max="1.0" step="0.05"
                value={quality}
                onChange={e => setQuality(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand)', height: 6, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          </div>

          {/* ── Page Gallery ── */}
          {pages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  {loadingThumbs
                    ? `Loading previews… ${thumbProgress.current}/${thumbProgress.total}`
                    : `JPG Pages (${pageCount})`}
                </span>
                {allConverted && pageCount > 1 && (
                  <span style={{ fontSize: 12, color: 'var(--pos)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> All pages converted
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 14,
                }}
              >
                {pages.map(pg => (
                  <div
                    key={pg.pageNumber}
                    className="c-card"
                    style={{
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Thumbnail area */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '0.707', // A4 ratio
                        background: pg.thumbDataUrl ? 'transparent' : 'var(--bg-2)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {pg.thumbDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pg.thumbDataUrl}
                          alt={`Page ${pg.pageNumber}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <Loader2
                          size={20}
                          style={{ animation: 'spin 1s linear infinite', color: 'var(--ink-3)' }}
                        />
                      )}
                      {/* Converted checkmark badge */}
                      {pg.blob && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 6, right: 6,
                            width: 20, height: 20,
                            borderRadius: '50%',
                            background: 'var(--pos)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <CheckCircle2 size={12} color="#fff" />
                        </div>
                      )}
                    </div>

                    {/* Page number + download button */}
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                        Page {pg.pageNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => downloadPage(pg.pageNumber)}
                        disabled={pg.converting || bulkConverting}
                        className="c-btn c-btn--sm"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: pg.blob ? 'var(--pos-subtle)' : 'var(--bg-2)',
                          color: pg.blob ? 'var(--pos)' : 'var(--ink)',
                          border: `1px solid ${pg.blob ? 'var(--pos-subtle)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          fontSize: 12, fontWeight: 600,
                          cursor: pg.converting || bulkConverting ? 'not-allowed' : 'pointer',
                          opacity: pg.converting || bulkConverting ? 0.6 : 1,
                          padding: '3px 8px',
                        }}
                      >
                        {pg.converting ? (
                          <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Download size={11} />
                        )}
                        JPG
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--neg-subtle)', color: 'var(--neg)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />{error}
            </div>
          )}

          {/* ── Action Bar ── */}
          <div
            className="c-card"
            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {bulkConverting
                  ? `Converting page ${bulkProgress.current} of ${bulkProgress.total}…`
                  : allConverted
                  ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} ready`
                  : loadingThumbs
                  ? 'Loading page previews…'
                  : `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} at ${dpi} DPI, ${Math.round(quality * 100)}% quality`}
              </span>
              {!bulkConverting && !loadingThumbs && !allConverted && (
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  Click ↓ JPG on any page to download individually, or convert all below
                </span>
              )}
            </div>

            <Button
              onClick={convertAll}
              loading={bulkConverting}
              disabled={bulkConverting || loadingThumbs || pageCount === 0}
              icon={bulkConverting ? undefined : allConverted ? <ZapIcon size={15} /> : <Download size={15} />}
            >
              {bulkConverting
                ? `Converting (${bulkProgress.current}/${bulkProgress.total})…`
                : allConverted
                ? pageCount === 1 ? 'Re-download JPG' : 'Re-download ZIP'
                : pageCount === 1
                ? 'Convert & Download JPG'
                : 'Convert & Download All (ZIP)'}
            </Button>
          </div>

        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
