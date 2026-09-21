'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Trash2, Download, AlertCircle, FileText, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import {
  renderAllThumbnails,
  parsePageRange,
  formatPageRange,
  type PageThumbnail,
} from '@/lib/pdfUtils';
import { PdfPageGrid } from '@/components/tools/pdf/PdfPageGrid';

export default function PdfPageDeleterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('');
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
      setDeletedPages(new Set());
      setRangeInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PDF pages.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePageDeletion = (pageIdx: number) => {
    setDeletedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIdx)) next.delete(pageIdx);
      else next.add(pageIdx);
      setRangeInput(formatPageRange(Array.from(next)));
      return next;
    });
  };

  const handleRangeInputChange = (text: string) => {
    setRangeInput(text);
    if (!thumbnails.length) return;
    const parsed = parsePageRange(text, thumbnails.length);
    setDeletedPages(new Set(parsed));
  };

  const resetDeletions = () => {
    setDeletedPages(new Set());
    setRangeInput('');
  };

  const deletePagesAndDownload = async () => {
    if (!file || !fileBuffer) return;
    const totalPages = thumbnails.length;
    const remainingIndices: number[] = [];

    for (let i = 0; i < totalPages; i++) {
      if (!deletedPages.has(i)) {
        remainingIndices.push(i);
      }
    }

    if (remainingIndices.length === 0) {
      setError('You cannot delete all pages. At least 1 page must remain.');
      return;
    }

    if (deletedPages.size === 0) {
      setError('No pages have been selected for deletion.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      const copiedPages = await outDoc.copyPages(srcDoc, remainingIndices);
      copiedPages.forEach(p => outDoc.addPage(p));

      const bytes = await outDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.pdf$/i, '');
      downloadBlob(blob, `${baseName}_modified.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileBuffer(null);
    setThumbnails([]);
    setDeletedPages(new Set());
    setRangeInput('');
    setError(null);
  };

  const remainingCount = thumbnails.length - deletedPages.size;

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
            <Trash2 size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to delete pages
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; click on pages to remove unwanted content
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
                  {formatFileSize(file.size)} &bull; {thumbnails.length} total pages &bull;{' '}
                  <span style={{ color: deletedPages.size > 0 ? 'var(--neg)' : 'var(--ink-2)' }}>
                    {deletedPages.size} marked for deletion
                  </span>
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              Choose Another PDF
            </Button>
          </div>

          {/* Quick Range / Reset Bar */}
          <div
            className="c-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 300px' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                Pages to Delete:
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={e => handleRangeInputChange(e.target.value)}
                placeholder="e.g. 2, 4-6"
                className="c-field__input"
                style={{ height: 36, maxWidth: 300 }}
              />
            </div>

            {deletedPages.size > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Undo2 size={14} />}
                onClick={resetDeletions}
              >
                Restore All Pages
              </Button>
            )}
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            Click on any page thumbnail below to mark or unmark it for deletion.
          </p>

          {/* Page Grid */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)' }}>
              Loading page thumbnails...
            </div>
          ) : (
            <PdfPageGrid
              thumbnails={thumbnails}
              mode="delete"
              deletedPages={deletedPages}
              onToggleDeletePage={togglePageDeletion}
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
                {remainingCount} {remainingCount === 1 ? 'page' : 'pages'} will remain in final PDF
              </span>
            </div>

            <Button
              onClick={deletePagesAndDownload}
              loading={isProcessing}
              disabled={isProcessing || deletedPages.size === 0 || remainingCount === 0}
              icon={<Download size={15} />}
            >
              {isProcessing
                ? 'Processing...'
                : `Delete ${deletedPages.size} ${deletedPages.size === 1 ? 'Page' : 'Pages'} & Save`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
