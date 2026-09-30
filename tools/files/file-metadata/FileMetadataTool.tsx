'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import { extractFileMetadata, FileMetadata } from '@/lib/files/engines';
import { Upload, Copy } from 'lucide-react';

interface ImageMetadata {
  width: number;
  height: number;
}

export default function FileMetadataTool() {
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const meta = extractFileMetadata(file);
    setMetadata(meta);
    setImageMeta(null);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  const handleCopyJson = () => {
    if (!metadata) return;
    const data = { ...metadata, ...(imageMeta || {}) };
    copyToClipboard(JSON.stringify(data, null, 2));
    toast.success('Copied JSON to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4 text-center border-dashed border-2 p-8" onClick={() => fileInputRef.current?.click()} style={{ borderColor: 'var(--color-border)', cursor: 'pointer' }}>
        <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--color-muted)' }} />
        <p>Click or drag to upload any file</p>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {metadata && (
        <div className="card space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">File Metadata</h2>
            <Button onClick={handleCopyJson} variant="secondary" icon={<Copy size={16} />}>Copy JSON</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>File Name</div>
              <div className="break-all font-medium">{metadata.name}</div>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>Size</div>
              <div className="font-medium">{metadata.formattedSize} <span className="text-sm font-normal opacity-70">({metadata.size} bytes)</span></div>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>Type (MIME)</div>
              <div className="font-medium">{metadata.type}</div>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>Extension</div>
              <div className="font-medium">{metadata.extension || 'None'}</div>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>Last Modified</div>
              <div className="font-medium">{metadata.lastModified}</div>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>Path</div>
              <div className="font-medium">N/A (browser restriction)</div>
            </div>
            {metadata.type.startsWith('text/') && (
              <div className="p-3 rounded md:col-span-2" style={{ backgroundColor: 'var(--color-surface2)' }}>
                <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>Estimated Encoding</div>
                <div className="font-medium">UTF-8</div>
              </div>
            )}
            {imageMeta && (
              <div className="p-3 rounded md:col-span-2" style={{ backgroundColor: 'var(--color-surface2)' }}>
                <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>Image Resolution</div>
                <div className="font-medium">{imageMeta.width} × {imageMeta.height} px</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
