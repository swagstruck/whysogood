'use client';
import React, { useState, useRef } from 'react';
import { FileText, Copy, Check, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { getPdfJs } from '@/lib/pdfUtils';

export default function PdfToTextTool() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copied, setCopied] = useState(false);
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
    setIsExtracting(true);
    setExtractedText('');

    try {
      const buffer = await f.arrayBuffer();
      const pdfjs = await getPdfJs();
      if (!pdfjs) throw new Error('PDF.js engine is not available.');

      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer).slice() }).promise;
      setPageCount(doc.numPages);

      let fullText = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item: any) => item.str || '')
          .filter(Boolean);

        const pageText = pageStrings.join(' ');
        fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
      }

      setExtractedText(fullText.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = () => {
    if (!file || !extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const baseName = file.name.replace(/\.pdf$/i, '');
    downloadBlob(blob, `${baseName}_extracted_text.txt`);
  };

  const reset = () => {
    setFile(null);
    setExtractedText('');
    setPageCount(0);
    setError(null);
  };

  const wordCount = extractedText ? extractedText.trim().split(/\s+/).length : 0;
  const charCount = extractedText.length;

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
            <FileText size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to extract text
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; extracts all text content page by page
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
                  {formatFileSize(file.size)} &bull; {pageCount} {pageCount === 1 ? 'page' : 'pages'} &bull;{' '}
                  {wordCount} words &bull; {charCount} characters
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              Choose Another PDF
            </Button>
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

          {/* Textarea Viewport */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={isExtracting ? 'Extracting text from PDF document...' : extractedText}
              onChange={e => setExtractedText(e.target.value)}
              placeholder="Extracted text will appear here..."
              className="c-field__input"
              rows={18}
              style={{
                width: '100%',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                lineHeight: 1.6,
                padding: 16,
                borderRadius: 'var(--radius-lg)',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

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
                {wordCount} words extracted across {pageCount} pages
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                variant="secondary"
                onClick={copyToClipboard}
                disabled={isExtracting || !extractedText}
                icon={copied ? <Check size={14} /> : <Copy size={14} />}
              >
                {copied ? 'Copied!' : 'Copy Text'}
              </Button>
              <Button
                onClick={downloadText}
                disabled={isExtracting || !extractedText}
                icon={<Download size={14} />}
              >
                Download .txt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
