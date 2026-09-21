'use client';
import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Download, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { getPdfJs, createZipArchive } from '@/lib/pdfUtils';

export default function PdfToPngTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [dpi, setDpi] = useState<number>(150);
  const [transparent, setTransparent] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [renderedImages, setRenderedImages] = useState<{ pageNumber: number; blob: Blob; dataUrl: string }[]>([]);
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
    setRenderedImages([]);

    try {
      const buffer = await f.arrayBuffer();
      const pdfjs = await getPdfJs();
      if (!pdfjs) throw new Error('PDF.js renderer not available.');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer).slice() }).promise;
      setPageCount(doc.numPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF.');
    }
  };

  const convertToPng = async () => {
    if (!file) return;
    setIsConverting(true);
    setError(null);
    setProgress({ current: 0, total: pageCount });

    try {
      const pdfjs = await getPdfJs();
      const buffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer).slice() }).promise;
      const images: { pageNumber: number; blob: Blob; dataUrl: string }[] = [];
      const scale = dpi / 72;

      for (let i = 1; i <= doc.numPages; i++) {
        setProgress({ current: i, total: doc.numPages });
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        if (!transparent) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
        if (blob) {
          images.push({
            pageNumber: i,
            blob,
            dataUrl: canvas.toDataURL('image/png'),
          });
        }
      }

      setRenderedImages(images);

      const baseName = file.name.replace(/\.pdf$/i, '');
      if (images.length === 1) {
        downloadBlob(images[0].blob, `${baseName}_page_1.png`);
      } else {
        const filesMap: Record<string, Uint8Array> = {};
        for (const item of images) {
          const arrBuffer = await item.blob.arrayBuffer();
          filesMap[`${baseName}_page_${item.pageNumber}.png`] = new Uint8Array(arrBuffer);
        }
        const zipBlob = createZipArchive(filesMap);
        downloadBlob(zipBlob, `${baseName}_png_images.zip`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to PNG.');
    } finally {
      setIsConverting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setRenderedImages([]);
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

          {/* Options */}
          <div
            className="c-card"
            style={{
              padding: '18px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {/* DPI Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Resolution (DPI):
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: '72 (Web)', val: 72 },
                  { label: '150 (Normal)', val: 150 },
                  { label: '300 (High)', val: 300 },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDpi(item.val)}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: dpi === item.val ? 'var(--brand)' : 'var(--bg-2)',
                      color: dpi === item.val ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transparency toggle */}
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
                    border: '1px solid var(--border)',
                  }}
                >
                  White Background
                </button>
                <button
                  type="button"
                  onClick={() => setTransparent(true)}
                  className="c-btn c-btn--sm"
                  style={{
                    flex: 1,
                    background: transparent ? 'var(--brand)' : 'var(--bg-2)',
                    color: transparent ? '#fff' : 'var(--ink)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Transparent
                </button>
              </div>
            </div>
          </div>

          {/* Rendered images gallery */}
          {renderedImages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                Rendered PNG Pages ({renderedImages.length})
              </span>

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
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={`Page ${img.pageNumber}`}
                      style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
                    />
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                        Page {img.pageNumber}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Download size={12} />}
                        onClick={() => downloadBlob(img.blob, `page_${img.pageNumber}.png`)}
                      >
                        PNG
                      </Button>
                    </div>
                  </div>
                ))}
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
                {isConverting
                  ? `Rendering page ${progress.current} of ${progress.total}...`
                  : `Ready to convert ${pageCount} ${pageCount === 1 ? 'page' : 'pages'} to PNG`}
              </span>
            </div>

            <Button
              onClick={convertToPng}
              loading={isConverting}
              disabled={isConverting}
              icon={<Download size={15} />}
            >
              {isConverting
                ? `Converting (${progress.current}/${progress.total})...`
                : pageCount === 1
                ? 'Convert & Download PNG'
                : 'Convert & Download All (ZIP)'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
