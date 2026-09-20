'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileIcon, AlertCircle } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { FieldMessage } from '@/components/ui/FieldMessage';

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onFiles: (files: File[]) => void;
  label?: string;
  formats?: string[];
  files?: File[];
  onRemove?: (index: number) => void;
  onClear?: () => void;
}

/** Parse an `accept` string like "image/*,image/png" into MIME types + extensions */
function parseAccept(accept: string): string[] {
  return accept.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function fileMatchesAccept(file: File, acceptPatterns: string[]): boolean {
  if (!acceptPatterns.length) return true;
  return acceptPatterns.some(pattern => {
    if (pattern.endsWith('/*')) {
      return file.type.startsWith(pattern.slice(0, -2));
    }
    if (pattern.startsWith('.')) {
      return file.name.toLowerCase().endsWith(pattern);
    }
    return file.type === pattern;
  });
}

export function FileUploader({
  accept,
  multiple = false,
  maxSizeMB = 50,
  onFiles,
  label = 'Drop files here or click to browse',
  formats = [],
  files = [],
  onRemove,
  onClear,
}: FileUploaderProps) {
  const [dragDepth, setDragDepth] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOver = dragDepth > 0;
  const acceptPatterns = accept ? parseAccept(accept) : [];

  const processFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    const newErrors: string[] = [];
    const valid: File[] = [];

    arr.forEach(f => {
      if (accept && !fileMatchesAccept(f, acceptPatterns)) {
        const ext = f.name.split('.').pop()?.toUpperCase() || f.type;
        newErrors.push(`"${f.name}" is not a supported file type${formats.length ? ` (accepted: ${formats.join(', ')})` : ''}.`);
        return;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        newErrors.push(`"${f.name}" exceeds the ${maxSizeMB} MB limit (${formatFileSize(f.size)}).`);
        return;
      }
      valid.push(f);
    });

    setErrors(newErrors);
    if (valid.length) onFiles(valid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFiles, maxSizeMB, accept, formats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="File upload area"
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragEnter={e => { e.preventDefault(); setDragDepth(d => d + 1); }}
        onDragOver={e => { e.preventDefault(); }}
        onDragLeave={e => { e.preventDefault(); setDragDepth(d => Math.max(0, d - 1)); }}
        onDrop={e => { e.preventDefault(); setDragDepth(0); setErrors([]); processFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${errors.length > 0 ? 'var(--color-error)' : isOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: errors.length > 0
            ? 'var(--color-error-subtle)'
            : isOver ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-base)',
          transform: isOver ? 'scale(1.01)' : 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={e => { setErrors([]); processFiles(e.target.files); }}
          style={{ display: 'none' }}
          onClick={e => { (e.target as HTMLInputElement).value = ''; }}
        />
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-lg)',
          background: errors.length > 0 ? 'rgba(239,68,68,0.15)' : isOver ? 'var(--color-accent)' : 'var(--color-surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          transition: 'background var(--transition-base)',
        }}>
          {errors.length > 0
            ? <AlertCircle size={22} style={{ color: 'var(--color-error)' }} />
            : <Upload size={22} style={{ color: isOver ? '#fff' : 'var(--color-muted)' }} />
          }
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: errors.length > 0 ? 'var(--color-error)' : 'var(--color-text)', margin: '0 0 6px' }}>
          {isOver ? 'Release to upload' : errors.length > 0 ? 'Upload failed — try again' : label}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-faint)', margin: '0 0 12px' }}>
          or click to browse &mdash; max {maxSizeMB} MB {multiple ? 'per file' : ''}
        </p>
        {formats.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {formats.map(f => (
              <span key={f} style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-faint)', background: 'var(--color-surface2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Inline error messages — one per rejected file */}
      {errors.map((msg, i) => (
        <FieldMessage key={i} variant="error">{msg}</FieldMessage>
      ))}

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>{files.length} file{files.length > 1 ? 's' : ''} selected</span>
            {onClear && (
              <button onClick={onClear} style={{ fontSize: 12, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Clear all
              </button>
            )}
          </div>
          {files.map((file, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
              <FileIcon size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <span style={{ fontSize: 12, color: 'var(--color-faint)', flexShrink: 0 }}>{formatFileSize(file.size)}</span>
              {onRemove && (
                <button onClick={() => onRemove(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-faint)', padding: 2, display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
