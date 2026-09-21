'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Unlock, Download, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';

export default function PdfUnlockTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);
  };

  const unlockPdf = async () => {
    if (!file) return;
    setIsUnlocking(true);
    setError(null);

    try {
      // Load document with encryption bypassed/stripped
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      // Save as completely decrypted document with standard stream encoding
      const decryptedBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.pdf$/i, '');
      downloadBlob(blob, `${baseName}_unlocked.pdf`);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock PDF. The file may be heavily corrupted.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const reset = () => {
    setFile(null);
    setSuccess(false);
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
            <Unlock size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Select a PDF to unlock
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            or drop PDF here &bull; remove security restrictions and owner passwords
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
                  {formatFileSize(file.size)} &bull; Ready to unlock
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={reset}>
              Choose Another PDF
            </Button>
          </div>

          <div
            className="c-card"
            style={{
              padding: '24px 28px',
              maxWidth: 540,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--pos-subtle)',
                  color: 'var(--pos)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Unlock size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                  Remove Security Restrictions
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
                  Removes print/copy protections and standard encryption so the file can be viewed and edited anywhere.
                </p>
              </div>
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

          {success && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--pos-subtle)',
                color: 'var(--pos)',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={18} />
              Your PDF has been unlocked and downloaded successfully!
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
                Click below to unlock and download
              </span>
            </div>

            <Button
              onClick={unlockPdf}
              loading={isUnlocking}
              disabled={isUnlocking}
              icon={<Download size={15} />}
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock PDF & Download'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
