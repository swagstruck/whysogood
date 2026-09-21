'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Scissors, Download, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import {
  renderAllThumbnails,
  parsePageRange,
  createZipArchive,
  type PageThumbnail,
} from '@/lib/pdfUtils';
import { PdfPageGrid } from '@/components/tools/pdf/PdfPageGrid';

export default function PdfSplitterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [splitMode, setSplitMode] = useState<'ranges' | 'all' | 'custom'>('ranges');
  const [rangeInput, setRangeInput] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
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
    setIsLoadingThumbnails(true);

    try {
      const buffer = await f.arrayBuffer();
      const thumbs = await renderAllThumbnails(buffer);
      setThumbnails(thumbs);
      setRangeInput(thumbs.length > 1 ? `1-${Math.ceil(thumbs.length / 2)}, ${Math.ceil(thumbs.length / 2) + 1}-${thumbs.length}` : '1');
      setSelectedPages(new Set([0]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PDF pages.');
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const togglePageSelection = (pageIdx: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIdx)) next.delete(pageIdx);
      else next.add(pageIdx);
      return next;
    });
  };

  const splitPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const baseName = file.name.replace(/\.pdf$/i, '');
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      if (splitMode === 'all') {
        // Each page into its own PDF, bundled into a ZIP
        const filesMap: Record<string, Uint8Array> = {};
        for (let i = 0; i < totalPages; i++) {
          const singleDoc = await PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
          singleDoc.addPage(copiedPage);
          const bytes = await singleDoc.save({ useObjectStreams: true });
          filesMap[`${baseName}_page_${i + 1}.pdf`] = bytes;
        }
        const zipBlob = createZipArchive(filesMap);
        downloadBlob(zipBlob, `${baseName}_pages.zip`);
      } else if (splitMode === 'ranges') {
        // Multiple ranges
        const rangeGroups = rangeInput.split(',').map(s => s.trim()).filter(Boolean);
        if (rangeGroups.length === 0) {
          throw new Error('Please specify at least one valid range.');
        }

        const filesMap: Record<string, Uint8Array> = {};
        for (let idx = 0; idx < rangeGroups.length; idx++) {
          const rStr = rangeGroups[idx];
          const indices = parsePageRange(rStr, totalPages);
          if (indices.length === 0) continue;

          const rangeDoc = await PDFDocument.create();
          const copiedPages = await rangeDoc.copyPages(srcDoc, indices);
          copiedPages.forEach(p => rangeDoc.addPage(p));
          const bytes = await rangeDoc.save({ useObjectStreams: true });
          filesMap[`${baseName}_part_${idx + 1}_(pages_${rStr.replace(/\s+/g, '')}).pdf`] = bytes;
        }

        const fileKeys = Object.keys(filesMap);
        if (fileKeys.length === 0) throw new Error('No valid pages found in ranges.');
        if (fileKeys.length === 1) {
          const blob = new Blob([filesMap[fileKeys[0]] as unknown as BlobPart], { type: 'application/pdf' });
          downloadBlob(blob, fileKeys[0]);
        } else {
          const zipBlob = createZipArchive(filesMap);
          downloadBlob(zipBlob, `${baseName}_split_ranges.zip`);
        }
      } else if (splitMode === 'custom') {
        // Selected pages into 1 PDF
        const indices = Array.from(selectedPages).sort((a, b) => a - b);
        if (indices.length === 0) throw new Error('Please select at least 1 page.');

        const customDoc = await PDFDocument.create();
        const copiedPages = await customDoc.copyPages(srcDoc, indices);
        copiedPages.forEach(p => customDoc.addPage(p));
        const bytes = await customDoc.save({ useObjectStreams: true });
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        downloadBlob(blob, `${baseName}_extracted.pdf`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setThumbnails([]);
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
            <Scissors size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to split
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; split by range, extract pages, or separate all pages
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* File Header */}
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
              Choose Another PDF
            </Button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="tabs-bar">
            <button
              onClick={() => setSplitMode('ranges')}
              className={`tab-item${splitMode === 'ranges' ? ' active' : ''}`}
            >
              Split by Range
            </button>
            <button
              onClick={() => setSplitMode('all')}
              className={`tab-item${splitMode === 'all' ? ' active' : ''}`}
            >
              Extract All Pages ({thumbnails.length})
            </button>
            <button
              onClick={() => setSplitMode('custom')}
              className={`tab-item${splitMode === 'custom' ? ' active' : ''}`}
            >
              Select Pages ({selectedPages.size} chosen)
            </button>
          </div>

          {/* Mode-specific Settings */}
          {splitMode === 'ranges' && (
            <div
              className="c-card"
              style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Page Ranges (comma-separated):
              </label>
              <input
                type="text"
                value={rangeInput}
                onChange={e => setRangeInput(e.target.value)}
                placeholder="e.g. 1-2, 3-5, 6"
                className="c-field__input"
                style={{ height: 38 }}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
                Example: <code>1-3, 4-6</code> will create 2 separate documents.
              </p>
            </div>
          )}

          {splitMode === 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
                Click on the page cards below to select the pages you want to keep.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedPages(new Set(thumbnails.map((_, i) => i)))}
                >
                  Select All
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setSelectedPages(new Set())}>
                  Deselect All
                </Button>
              </div>
            </div>
          )}

          {/* Page Grid */}
          {isLoadingThumbnails ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)' }}>
              Generating visual page thumbnails...
            </div>
          ) : (
            <PdfPageGrid
              thumbnails={thumbnails}
              mode={splitMode === 'custom' ? 'select' : 'view'}
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
                {splitMode === 'all'
                  ? `Extracting ${thumbnails.length} individual page PDFs`
                  : splitMode === 'ranges'
                  ? `Splitting into range documents`
                  : `Extracting ${selectedPages.size} selected pages`}
              </span>
            </div>

            <Button
              onClick={splitPdf}
              loading={isProcessing}
              disabled={isProcessing || (splitMode === 'custom' && selectedPages.size === 0)}
              icon={<Download size={15} />}
            >
              {isProcessing ? 'Processing...' : 'Split & Download'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
