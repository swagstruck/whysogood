'use client';
import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, File, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import type { Category } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';

interface SimpleModeDropzoneProps {
  activeFile: File | null;
  detectedCategory: Category;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
}

export function SimpleModeDropzone({
  activeFile,
  detectedCategory,
  onFileSelect,
  onClearFile,
}: SimpleModeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage object URL for active file thumbnail
  useEffect(() => {
    let activeUrl: string | null = null;
    if (activeFile && activeFile.type.startsWith('image/')) {
      activeUrl = URL.createObjectURL(activeFile);
      const urlToSet = activeUrl;
      queueMicrotask(() => {
        setPreviewUrl(urlToSet);
      });
    } else {
      queueMicrotask(() => {
        setPreviewUrl(null);
      });
    }
    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [activeFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
    // reset input so selecting the same file triggers change
    e.target.value = '';
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  // ── Loaded State ───────────────────────────────────────────────────────────
  if (activeFile) {
    const ext = activeFile.name.split('.').pop()?.toUpperCase() || 'FILE';

    return (
      <div
        className="c-card"
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          transition: 'all var(--transition-base)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
          {/* File Thumbnail / Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={activeFile.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <File size={28} style={{ color: 'var(--brand)' }} />
            )}
          </div>

          {/* File Details */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '360px',
                }}
                title={activeFile.name}
              >
                {activeFile.name}
              </span>
              <span
                className="c-badge c-badge--brand"
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {detectedCategory}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                  background: 'var(--bg-2)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                {ext}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--ink-2)' }}>
              <span>{formatFileSize(activeFile.size)}</span>
              <span>•</span>
              <span style={{ color: 'var(--pos)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} /> Ready in workbench
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={triggerPicker}
            className="c-btn c-btn--secondary c-btn--sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              height: 36,
            }}
            title="Choose a different file to load"
          >
            <RefreshCw size={14} />
            <span>Replace File</span>
          </button>

          <button
            onClick={onClearFile}
            className="c-btn c-btn--ghost c-btn--sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              height: 36,
              color: 'var(--ink-2)',
            }}
            title="Remove active file and reset"
          >
            <X size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Empty Upload State ─────────────────────────────────────────────────────
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerPicker}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerPicker();
        }
      }}
      style={{
        padding: '56px 24px',
        borderRadius: 'var(--radius-xl)',
        background: isDragging ? 'var(--brand-subtle)' : 'var(--bg-1)',
        border: `2px dashed ${isDragging ? 'var(--brand)' : 'var(--border)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all var(--transition-base)',
        outline: 'none',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-xl)',
          background: isDragging ? 'var(--brand)' : 'var(--brand-subtle)',
          color: isDragging ? '#ffffff' : 'var(--brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          transition: 'all var(--transition-base)',
        }}
      >
        <UploadCloud size={32} />
      </div>

      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}
      >
        Drop your file here to open Simple Mode
      </h3>

      <p
        style={{
          fontSize: 14,
          color: 'var(--ink-2)',
          margin: '0 0 20px',
          maxWidth: 480,
          lineHeight: 1.5,
        }}
      >
        Upload once, execute multiple tools without re-uploading. 100% private in-browser processing.
      </p>

      {/* Supported format badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['PNG', 'JPG', 'WEBP', 'SVG', 'PDF', 'CSV', 'JSON', 'TXT'].map(fmt => (
          <span
            key={fmt}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-3)',
              background: 'var(--bg-2)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}
