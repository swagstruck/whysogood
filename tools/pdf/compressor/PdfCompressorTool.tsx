'use client';
import React, { useState, useRef } from 'react';
import { Download, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, calcReductionPct, downloadBlob } from '@/lib/utils';
import { PDFDocument } from 'pdf-lib';

export default function PdfCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [compressionLevel, setCompressionLevel] = useState<'standard' | 'extreme'>('standard');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) {
      setError('Please select a valid PDF document.');
      return;
    }
    setError(null);
    setFile(f);
    setResultBlob(null);

    try {
      const buffer = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setPageCount(pdfDoc.getPageCount());
    } catch {
      setPageCount(1);
    }
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      // Load existing PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      // Clean metadata and compress streams using object streams
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('whysogood browser compressor');
      pdfDoc.setCreator('whysogood');

      // Re-encode with object streams (flate compression applied to objects)
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateFieldAppearances: false,
      });

      // If re-encoded is smaller, use it; otherwise use original
      const finalBytes = compressedBytes.length < file.size ? compressedBytes : new Uint8Array(buffer);
      const outBlob = new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });

      setResultBlob(outBlob);
      setResultSize(outBlob.size);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultBlob(null);
    setResultSize(0);
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0] || null)}
          />
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <FileText size={28} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
            Select a PDF to compress
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Files are processed directly on your machine. Nothing leaves your browser.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-accent)',
              }}>
                <FileText size={22} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>
                  {formatFileSize(file.size)} &bull; {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              Change File
            </Button>
          </div>

          {/* Level selection */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setCompressionLevel('standard')}
              style={{
                flex: 1, padding: 12, borderRadius: 'var(--radius-md)',
                border: '1px solid',
                borderColor: compressionLevel === 'standard' ? 'var(--color-accent)' : 'var(--color-border)',
                background: compressionLevel === 'standard' ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                color: compressionLevel === 'standard' ? 'var(--color-accent)' : 'var(--color-text)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>Recommended Compression</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                Optimizes internal streams and strips redundant objects without losing quality.
              </div>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={compressPdf} loading={isProcessing} disabled={isProcessing}>
              {isProcessing ? 'Compressing PDF...' : 'Compress PDF'}
            </Button>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-error-subtle)', color: 'var(--color-error)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Result */}
          {resultBlob && (
            <div style={{
              padding: 16, borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface2)', border: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Compression Result</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: 'var(--color-success-subtle)', color: 'var(--color-success)',
                }}>
                  {resultSize < file.size ? `-${calcReductionPct(file.size, resultSize)}% Smaller` : 'Optimal Size'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--color-muted)' }}>
                <div>Original: <strong style={{ color: 'var(--color-text)' }}>{formatFileSize(file.size)}</strong></div>
                <div>&rarr;</div>
                <div>Result: <strong style={{ color: 'var(--color-success)' }}>{formatFileSize(resultSize)}</strong></div>
              </div>
              <div>
                <Button
                  onClick={() => downloadBlob(resultBlob, `compressed_${file.name}`)}
                  icon={<Download size={14} />}
                >
                  Download Compressed PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
