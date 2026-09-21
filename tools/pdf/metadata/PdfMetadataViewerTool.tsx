'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Info, Copy, Check, Download, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { getPdfJs } from '@/lib/pdfUtils';

interface MetadataFields {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
  pageCount: number;
  pdfVersion: string;
  fileSize: string;
  pageDimensions: string;
}

export default function PdfMetadataViewerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MetadataFields | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      const firstPage = pageCount > 0 ? pdfDoc.getPage(0) : null;
      const dims = firstPage
        ? `${Math.round(firstPage.getWidth())} × ${Math.round(firstPage.getHeight())} pt`
        : 'Unknown';

      // Also query PDF.js for detailed trailer metadata
      let pdfJsMeta: any = {};
      try {
        const pdfjs = await getPdfJs();
        if (pdfjs) {
          const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer).slice() }).promise;
          const meta = await doc.getMetadata();
          pdfJsMeta = meta.info || {};
        }
      } catch {
        // Fallback to pdf-lib only
      }

      const formatDate = (d: Date | string | undefined) => {
        if (!d) return 'Not specified';
        if (d instanceof Date) return d.toLocaleString();
        return String(d);
      };

      setMetadata({
        title: pdfDoc.getTitle() || pdfJsMeta.Title || 'None',
        author: pdfDoc.getAuthor() || pdfJsMeta.Author || 'None',
        subject: pdfDoc.getSubject() || pdfJsMeta.Subject || 'None',
        keywords: pdfDoc.getKeywords() || pdfJsMeta.Keywords || 'None',
        creator: pdfDoc.getCreator() || pdfJsMeta.Creator || 'None',
        producer: pdfDoc.getProducer() || pdfJsMeta.Producer || 'None',
        creationDate: formatDate(pdfDoc.getCreationDate() || pdfJsMeta.CreationDate),
        modificationDate: formatDate(pdfDoc.getModificationDate() || pdfJsMeta.ModDate),
        pageCount,
        pdfVersion: pdfJsMeta.PDFFormatVersion || '1.7',
        fileSize: formatFileSize(f.size),
        pageDimensions: dims,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inspect PDF metadata.');
    }
  };

  const copyField = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportJson = () => {
    if (!metadata || !file) return;
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const baseName = file.name.replace(/\.pdf$/i, '');
    downloadBlob(blob, `${baseName}_metadata.json`);
  };

  const reset = () => {
    setFile(null);
    setMetadata(null);
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

      {!file || !metadata ? (
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
            <Info size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to view metadata
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; view author, creation dates, title, dimensions, and properties
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
                  {metadata.fileSize} &bull; {metadata.pageCount} pages &bull; PDF v{metadata.pdfVersion}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportJson}>
                Export JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                Choose Another PDF
              </Button>
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

          {/* Metadata Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {[
              { label: 'Title', key: 'title', val: metadata.title },
              { label: 'Author', key: 'author', val: metadata.author },
              { label: 'Subject', key: 'subject', val: metadata.subject },
              { label: 'Keywords', key: 'keywords', val: metadata.keywords },
              { label: 'Creator Tool', key: 'creator', val: metadata.creator },
              { label: 'PDF Producer', key: 'producer', val: metadata.producer },
              { label: 'Creation Date', key: 'creationDate', val: metadata.creationDate },
              { label: 'Modification Date', key: 'modificationDate', val: metadata.modificationDate },
              { label: 'Page Count', key: 'pageCount', val: String(metadata.pageCount) },
              { label: 'Page Dimensions', key: 'pageDimensions', val: metadata.pageDimensions },
              { label: 'PDF Version', key: 'pdfVersion', val: metadata.pdfVersion },
              { label: 'File Size', key: 'fileSize', val: metadata.fileSize },
            ].map(item => (
              <div
                key={item.key}
                className="c-card"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)' }}>
                    {item.label}
                  </span>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 14,
                      fontWeight: 500,
                      color: item.val === 'None' ? 'var(--ink-3)' : 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.val}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copyField(item.key, item.val)}
                  title="Copy value"
                  style={{
                    padding: 6,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: copiedKey === item.key ? 'var(--pos)' : 'var(--ink-2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {copiedKey === item.key ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
