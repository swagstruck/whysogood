'use client';

import React, { useState, useRef, useId } from 'react';
import { Upload, Trash2, Package, Download, Check, Sparkles, FolderPlus, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { downloadBlob, readFileAsArrayBuffer, formatFileSize } from '@/lib/utils';
import { zip, Zippable } from 'fflate';

interface ZipFileItem {
  id: string;
  file: File;
  path: string;
}

export default function ZipCreatorTool() {
  const fileInputId = useId();
  const [files, setFiles] = useState<ZipFileItem[]>([]);
  const [folderPrefix, setFolderPrefix] = useState<string>('');
  const [compression, setCompression] = useState<string>('6');
  const [filename, setFilename] = useState<string>('archive.zip');
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [result, setResult] = useState<{ originalSize: number; compressedSize: number; ratio: number } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      path: f.name
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setResult(null);
    toast.success(`Added ${newFiles.length} file(s)`);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setResult(null);
  };

  const updateFilePath = (id: string, newPath: string) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, path: newPath } : f)));
  };

  const confirmClearAll = () => {
    setFiles([]);
    setResult(null);
    setShowClearConfirm(false);
    toast.success('Cleared all files');
  };

  const handleCreateZip = async () => {
    if (files.length === 0) {
      toast.error('Please add at least one file to create a ZIP');
      return;
    }

    setIsZipping(true);
    setResult(null);

    try {
      const zippable: Zippable = {};
      let totalInputSize = 0;

      for (const item of files) {
        totalInputSize += item.file.size;
        const buffer = await readFileAsArrayBuffer(item.file);
        const uint8 = new Uint8Array(buffer);
        const cleanPath = item.path.replace(/^\/+/, '');
        const fullPath = folderPrefix
          ? `${folderPrefix.replace(/\/+$/, '')}/${cleanPath}`
          : cleanPath;
        zippable[fullPath] = uint8;
      }

      zip(zippable, { level: parseInt(compression, 10) as any }, (err, data) => {
        setIsZipping(false);
        if (err) {
          toast.error('Failed to create ZIP archive');
          return;
        }

        const finalName = filename.endsWith('.zip') ? filename : `${filename}.zip`;
        const blob = new Blob([data as unknown as BlobPart], { type: 'application/zip' });
        downloadBlob(blob, finalName);

        const compressedLength = data.length;
        const savedPercent = totalInputSize > 0
          ? ((totalInputSize - compressedLength) / totalInputSize) * 100
          : 0;

        setResult({
          originalSize: totalInputSize,
          compressedSize: compressedLength,
          ratio: Math.max(0, Math.round(savedPercent * 10) / 10)
        });

        toast.success(`Created & downloaded ${finalName}`);
      });
    } catch {
      setIsZipping(false);
      toast.error('Error reading files during archive creation');
    }
  };

  const totalOriginalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Settings Card */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Client-Side ZIP Archive Creator
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Bundle, organize into folder hierarchies, and compress files into standard ZIP archives locally using fast multi-threaded Deflate.
            </p>
          </div>
          {files.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 size={16} /> Clear All
              </Button>
            </div>
          )}
        </div>

        {/* Configuration Fields Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="c-field">
            <label className="c-field__label">Output ZIP Filename</label>
            <input
              className="c-field__input"
              type="text"
              placeholder="archive.zip"
              value={filename}
              onChange={e => setFilename(e.target.value)}
            />
          </div>

          <div className="c-field">
            <label className="c-field__label">Root Folder Prefix (Optional)</label>
            <input
              className="c-field__input"
              type="text"
              placeholder="e.g. project-assets/"
              value={folderPrefix}
              onChange={e => setFolderPrefix(e.target.value)}
            />
          </div>

          <div className="c-field">
            <label className="c-field__label">Deflate Compression Level</label>
            <select
              className="c-select"
              value={compression}
              onChange={e => setCompression(e.target.value)}
            >
              <option value="0">Store (0 - Fastest / Uncompressed)</option>
              <option value="4">Fast (4 - Quick compression)</option>
              <option value="6">Normal (6 - Balanced default)</option>
              <option value="9">Maximum (9 - Highest ratio)</option>
            </select>
          </div>
        </div>

        {/* Upload Zone */}
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '36px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '2px dashed var(--border)',
            backgroundColor: 'var(--bg-3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'border-color var(--transition-fast)'
          }}
        >
          <Upload size={32} style={{ color: 'var(--brand)' }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 'var(--text-body)' }}>
              {files.length > 0 ? 'Click or drop more files to add to archive' : 'Drop files here or click to select'}
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', marginTop: '4px' }}>
              Add any number of documents, images, code files, or data exports.
            </div>
          </div>
        </div>

        {/* Primary Action Button (Rule 2: strictly max 1 primary button per view) */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            type="button"
            className="c-btn c-btn--primary"
            onClick={handleCreateZip}
            disabled={files.length === 0 || isZipping}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Package size={18} />
            {isZipping ? 'Compressing Archive...' : `Create & Download ZIP (${files.length} files)`}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clear All (Rule 10: destructive actions require confirmation) */}
      {showClearConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Clear Archive Files?</h2>
              <button
                className="modal-close"
                onClick={() => setShowClearConfirm(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove all files currently queued for this ZIP archive?</p>
            </div>
            <div className="modal-footer">
              <button
                className="c-btn c-btn--ghost"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="c-btn c-btn--danger"
                onClick={confirmClearAll}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Metrics Card */}
      {result && (
        <div className="c-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={20} style={{ color: 'var(--pos)' }} />
            <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Archive Generated Successfully
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Original Size</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)' }}>
                {formatFileSize(result.originalSize)}
              </div>
            </div>

            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>ZIP Archive Size</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--brand)' }}>
                {formatFileSize(result.compressedSize)}
              </div>
            </div>

            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Space Saved</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--pos)' }}>
                {result.ratio}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Files in Archive List */}
      {files.length > 0 && (
        <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Files in Archive ({files.length} • {formatFileSize(totalOriginalSize)})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {files.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
                  <FileText size={20} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 'var(--text-body-sm)' }}>
                        {item.file.name}
                      </span>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-3)' }}>
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Path in ZIP:</span>
                      <input
                        className="c-field__input"
                        type="text"
                        value={item.path}
                        onChange={e => updateFilePath(item.id, e.target.value)}
                        style={{
                          height: '28px',
                          padding: '2px 8px',
                          fontSize: 'var(--text-caption)',
                          fontFamily: 'var(--font-mono)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(item.id)}
                  title="Remove from ZIP"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Privacy Callout */}
      <div className="c-alert c-alert--pos">
        <ShieldCheck size={20} />
        <div>
          <strong>100% In-Browser Compression:</strong> ZIP compression operates locally using fflate WebAssembly/pure-JS deflate routines without sending your data to any cloud service.
        </div>
      </div>
    </div>
  );
}
