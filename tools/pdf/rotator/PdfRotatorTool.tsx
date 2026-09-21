'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { RotateCw, RotateCcw, Download, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { renderAllThumbnails, type PageThumbnail } from '@/lib/pdfUtils';
import { PdfPageGrid } from '@/components/tools/pdf/PdfPageGrid';

export default function PdfRotatorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);

    try {
      const buffer = await f.arrayBuffer();
      setFileBuffer(buffer);
      const thumbs = await renderAllThumbnails(buffer);
      setThumbnails(thumbs);
      setRotations({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PDF pages.');
    } finally {
      setIsLoading(false);
    }
  };

  const rotateSinglePage = (pageNumber: number) => {
    setRotations(prev => ({
      ...prev,
      [pageNumber]: ((prev[pageNumber] || 0) + 90) % 360,
    }));
  };

  const rotateAll = (delta: number) => {
    setRotations(prev => {
      const next: Record<number, number> = {};
      thumbnails.forEach(t => {
        const cur = prev[t.pageNumber] || 0;
        next[t.pageNumber] = (cur + delta + 360) % 360;
      });
      return next;
    });
  };

  const resetRotations = () => {
    setRotations({});
  };

  const saveAndDownload = async () => {
    if (!file || !fileBuffer) return;
    setIsProcessing(true);
    setError(null);

    try {
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      pages.forEach((page, idx) => {
        const pageNum = idx + 1;
        const additionalRot = rotations[pageNum] || 0;
        if (additionalRot !== 0) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + additionalRot) % 360));
        }
      });

      const bytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.pdf$/i, '');
      downloadBlob(blob, `${baseName}_rotated.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileBuffer(null);
    setThumbnails([]);
    setRotations({});
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
            <RotateCw size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to rotate
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; rotate individual pages or the entire document
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header & Global Rotation Controls */}
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
                  {formatFileSize(file.size)} &bull; {thumbnails.length} pages
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              Change PDF
            </Button>
          </div>

          {/* Global Rotation Actions Bar */}
          <div
            className="c-card"
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCw size={14} />}
                onClick={() => rotateAll(90)}
              >
                Rotate All +90°
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={() => rotateAll(-90)}
              >
                Rotate All -90°
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={13} />}
                onClick={resetRotations}
              >
                Reset
              </Button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
              Tip: Hover over any page to rotate it individually.
            </p>
          </div>

          {/* Page Grid */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)' }}>
              Loading page thumbnails...
            </div>
          ) : (
            <PdfPageGrid
              thumbnails={thumbnails}
              rotations={rotations}
              mode="rotate"
              onRotatePage={rotateSinglePage}
            />
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
                {Object.values(rotations).some(r => r % 360 !== 0)
                  ? 'Changes ready to save'
                  : 'No rotations applied yet'}
              </span>
            </div>

            <Button
              onClick={saveAndDownload}
              loading={isProcessing}
              disabled={isProcessing}
              icon={<Download size={15} />}
            >
              {isProcessing ? 'Saving PDF...' : 'Download Rotated PDF'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
