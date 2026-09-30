'use client';
import React from 'react';
import { Music } from 'lucide-react';

interface AudioDropzoneProps {
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
  accept?: string;
  label?: string;
  multiple?: boolean;
}

export default function AudioDropzone({ onFile, onFiles, accept, label, multiple }: AudioDropzoneProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (multiple && onFiles) {
        onFiles(files);
      } else if (!multiple && onFile) {
        onFile(files[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (multiple && onFiles) {
        onFiles(files);
      } else if (!multiple && onFile) {
        onFile(files[0]);
      }
    }
  };

  return (
    <div
      className="card flex flex-col items-center justify-center p-8 border-dashed border-2 cursor-pointer transition-colors"
      style={{ borderColor: drag ? 'var(--color-accent)' : 'var(--color-border)', backgroundColor: drag ? 'var(--color-surface2)' : 'transparent' }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
      />
      <Music size={48} style={{ color: 'var(--color-muted)', marginBottom: '16px' }} />
      <p style={{ color: 'var(--color-text)', textAlign: 'center' }}>
        {label || (multiple ? 'Drop audio files here or click to browse' : 'Drop an audio file here or click to browse')}
      </p>
    </div>
  );
}
