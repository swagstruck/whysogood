'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileMinus, Download, AlertCircle, FileText, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import {
  renderAllThumbnails,
  parsePageRange,
  formatPageRange,
  createZipArchive,
  type PageThumbnail,
} from '@/lib/pdfUtils';
import { PdfPageGrid } from '@/components/tools/pdf/PdfPageGrid';

export default function PdfPageExtractorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState('');
  const [extractMode, setExtractMode] = useState<'merged' | 'zip'>('merged');
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
      const initialSet = new Set([0]);
      setSelectedPages(initialSet);
      setRangeText('1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PDF pages.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePageSelection = (pageIdx: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIdx)) next.delete(pageIdx);
      else next.add(pageIdx);
      setRangeText(formatPageRange(Array.from(next)));
      return next;
    });
  };

  const handleRangeInputChange = (text: string) => {
    setRangeText(text);
    if (!thumbnails.length) return;
    const parsed = parsePageRange(text, thumbnails.length);
    setSelectedPages(new Set(parsed));
  };

  const selectAll = () => {
    const all = new Set(thumbnails.map((_, i) => i));
    setSelectedPages(all);
    setRangeText(formatPageRange(Array.from(all)));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
    setRangeText('');
  };

  const extractPages = async () => {
    if (!file || !fileBuffer) return;
    const indices = Array.from(selectedPages).sort((a, b) => a - b);
    if (indices.length === 0) {
      setError('Please select at least one page to extract.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      const baseName = file.name.replace(/\.pdf$/i, '');

      if (extractMode === 'merged') {
        const outDoc = await PDFDocument.create();
        const copiedPages = await outDoc.copyPages(srcDoc, indices);
        copiedPages.forEach(p => outDoc.addPage(p));
        const bytes = await outDoc.save({ useObjectStreams: true });
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        downloadBlob(blob, `${baseName}_extracted.pdf`);
      } else {
        const filesMap: Record<string, Uint8Array> = {};
        for (const idx of indices) {
          const singleDoc = await PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(srcDoc, [idx]);
          singleDoc.addPage(copiedPage);
          const bytes = await singleDoc.save({ useObjectStreams: true });
          filesMap[`${baseName}_page_${idx + 1}.pdf`] = bytes;
        }
        const zipBlob = createZipArchive(filesMap);
        downloadBlob(zipBlob, `${baseName}_extracted_pages.zip`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setFileBuffer(null);
    setThumbnails([]);
    setSelectedPages(new Set());
    setRangeText('');
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
            <FileMinus size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to extract pages
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; select individual pages or ranges to save
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
                  {formatFileSize(file.size)} &bull; {thumbnails.length} pages total &bull;{' '}
                  <strong style={{ color: 'var(--brand)' }}>{selectedPages.size} selected</strong>
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              Choose Another PDF
            </Button>
          </div>

          {/* Controls Bar: Range Input & Select buttons */}
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
                Page Range:
              </label>
              <input
                type="text"
                value={rangeText}
                onChange={e => handleRangeInputChange(e.target.value)}
                placeholder="e.g. 1, 3-5, 8"
                className="c-field__input"
                style={{ height: 36, maxWidth: 300 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="secondary" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          {/* Mode Selector */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setExtractMode('merged')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid',
                borderColor: extractMode === 'merged' ? 'var(--brand)' : 'var(--border)',
                background: extractMode === 'merged' ? 'var(--brand-subtle)' : 'var(--bg-1)',
                color: extractMode === 'merged' ? 'var(--brand)' : 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>Merge into 1 PDF</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                Combine all selected pages into a single PDF document.
              </div>
            </button>

            <button
              onClick={() => setExtractMode('zip')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid',
                borderColor: extractMode === 'zip' ? 'var(--brand)' : 'var(--border)',
                background: extractMode === 'zip' ? 'var(--brand-subtle)' : 'var(--bg-1)',
                color: extractMode === 'zip' ? 'var(--brand)' : 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>Extract as Separate PDFs</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                Each selected page will be downloaded in a ZIP bundle.
              </div>
            </button>
          </div>

          {/* Visual Page Grid */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)' }}>
              Loading pages...
            </div>
          ) : (
            <PdfPageGrid
              thumbnails={thumbnails}
              mode="select"
              selectedPages={selectedPages}
              onToggleSelectPage={togglePageSelection}
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
                {selectedPages.size} of {thumbnails.length} pages chosen
              </span>
            </div>

            <Button
              onClick={extractPages}
              loading={isProcessing}
              disabled={isProcessing || selectedPages.size === 0}
              icon={<Download size={15} />}
            >
              {isProcessing
                ? 'Extracting...'
                : `Extract ${selectedPages.size} ${selectedPages.size === 1 ? 'Page' : 'Pages'}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
