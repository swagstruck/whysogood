'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FilePlus, Trash2, ArrowUp, ArrowDown, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { getPdfJs } from '@/lib/pdfUtils';

interface PdfFileItem {
  id: string;
  file: File;
  pageCount: number;
  thumbnailUrl?: string;
}

export default function PdfMergerTool() {
  const [files, setFiles] = useState<PdfFileItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [outputName, setOutputName] = useState('merged_document.pdf');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    setError(null);
    const pdfs = Array.from(fileList).filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfs.length === 0) {
      setError('Please select valid PDF files.');
      return;
    }

    const pdfjs = await getPdfJs();
    const newItems: PdfFileItem[] = [];

    for (const file of pdfs) {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      let count = 1;
      let thumb: string | undefined = undefined;

      try {
        const buffer = await file.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        count = doc.getPageCount();

        if (pdfjs) {
          const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer).slice() });
          const loadedDoc = await loadingTask.promise;
          const page = await loadedDoc.getPage(1);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumb = canvas.toDataURL('image/jpeg', 0.8);
          }
        }
      } catch (err) {
        console.warn('Could not read PDF info', err);
      }

      newItems.push({ id, file, pageCount: count, thumbnailUrl: thumb });
    }

    setFiles(prev => [...prev, ...newItems]);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles(prev => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const [removed] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, removed);
      return copy;
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF documents to merge.');
      return;
    }
    setIsMerging(true);
    setError(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const buffer = await item.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDF files.');
    } finally {
      setIsMerging(false);
    }
  };

  const totalPages = files.reduce((acc, f) => acc + f.pageCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hidden input for adding files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {files.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
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
            <FilePlus size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select PDF files to merge
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF files here &bull; processed entirely in your browser
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Actions Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
              </span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', marginLeft: 8 }}>
                ({totalPages} pages total)
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<FilePlus size={14} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Add More PDFs
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Reorderable File Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {files.map((item, idx) => (
              <div
                key={item.id}
                className="c-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                {/* Index badge */}
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--bg-2)',
                    color: 'var(--ink-2)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                {/* Thumbnail preview */}
                <div
                  style={{
                    width: 44,
                    height: 56,
                    background: 'var(--bg-2)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid var(--border)',
                  }}
                >
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <FilePlus size={18} style={{ color: 'var(--ink-3)' }} />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.file.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
                    {formatFileSize(item.file.size)} &bull; {item.pageCount}{' '}
                    {item.pageCount === 1 ? 'page' : 'pages'}
                  </p>
                </div>

                {/* Reorder & Delete buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveFile(idx, 'up')}
                    title="Move Up"
                    style={{
                      padding: 6,
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: idx === 0 ? 'var(--ink-3)' : 'var(--ink)',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ArrowUp size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={idx === files.length - 1}
                    onClick={() => moveFile(idx, 'down')}
                    title="Move Down"
                    style={{
                      padding: 6,
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: idx === files.length - 1 ? 'var(--ink-3)' : 'var(--ink)',
                      cursor: idx === files.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    title="Remove File"
                    style={{
                      padding: 6,
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--neg)',
                      cursor: 'pointer',
                      marginLeft: 4,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
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

          {/* Bottom Merge Controls */}
          <div
            className="c-card"
            style={{
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 240px' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Filename:
              </label>
              <input
                type="text"
                value={outputName}
                onChange={e => setOutputName(e.target.value)}
                className="c-field__input"
                style={{ height: 36, maxWidth: 280 }}
              />
            </div>

            <Button
              onClick={mergePdfs}
              loading={isMerging}
              disabled={isMerging || files.length < 2}
              icon={<Download size={15} />}
            >
              {isMerging ? 'Merging Documents...' : `Merge ${files.length} PDFs`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
