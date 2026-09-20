'use client';
import React, { useState, useRef } from 'react';
import { EyeOff, Download, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, downloadBlob } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function ImageMetadataRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cleanBlob, setCleanBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setCleanBlob(null);

    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise(res => {
        img.onload = res;
        img.src = url;
      });

      // Canvas re-encoding automatically discards EXIF, GPS, and metadata chunks
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const mime = f.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(blob => {
        if (blob) {
          setCleanBlob(blob);
          toast.success('All metadata stripped successfully!');
        }
        setIsProcessing(false);
      }, mime, 0.95);
    } catch {
      setIsProcessing(false);
      toast.error('Failed to strip metadata');
    }
  };

  const handleDownload = () => {
    if (!cleanBlob || !file) return;
    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.name.split('.').pop() || 'jpg';
    downloadBlob(cleanBlob, `${base}_cleaned.${ext}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
          }}
        >
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <EyeOff size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to remove metadata
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Strips GPS location, camera model, date/time, and author info &bull; 100% Client-side
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Status Card */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                  Original: {formatFileSize(file.size)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
            </div>

            <div style={{
              padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--color-success-subtle)',
              border: '1px solid rgba(34,197,94,0.25)', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontWeight: 700, fontSize: 14 }}>
                <ShieldCheck size={18} />
                <span>Privacy Protected</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                <li>GPS coordinates &amp; location data removed</li>
                <li>Camera make, model &amp; serial number erased</li>
                <li>Date and time stamps removed</li>
                <li>Thumbnail &amp; editing history stripped</li>
              </ul>
            </div>

            {cleanBlob && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                  Cleaned File Size: <strong>{formatFileSize(cleanBlob.size)}</strong>
                </div>
                <Button onClick={handleDownload} icon={<Download size={15} />}>
                  Download Sanitized Image
                </Button>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden',
              background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || ''}
                alt="Clean preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
