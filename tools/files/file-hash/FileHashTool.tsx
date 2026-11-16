'use client';

import React, { useState, useRef, useId } from 'react';
import { Upload, Copy, Download, Trash2, Check, X, ShieldCheck, FileText, AlertCircle, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob, readFileAsArrayBuffer, formatFileSize } from '@/lib/utils';
import { hashFileMd5, hashFileSha1, hashFileSha256, hashFileSha512 } from '@/lib/files/engines';

interface FileHashResult {
  id: string;
  name: string;
  size: number;
  md5?: string;
  sha1?: string;
  sha256?: string;
  sha512?: string;
  progress: number;
}

export default function FileHashTool() {
  const fileInputId = useId();
  const [files, setFiles] = useState<FileHashResult[]>([]);
  const [algos, setAlgos] = useState({ md5: true, sha1: false, sha256: true, sha512: true });
  const [compareHash, setCompareHash] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files).slice(0, 10 - files.length);
    if (incoming.length === 0) return;

    const initialFiles = incoming.map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      size: f.size,
      progress: 0
    }));

    setFiles(prev => [...prev, ...initialFiles]);

    for (let i = 0; i < incoming.length; i++) {
      const f = incoming[i];
      const id = initialFiles[i].id;
      try {
        const buffer = await readFileAsArrayBuffer(f);
        setFiles(prev => prev.map(p => (p.id === id ? { ...p, progress: 40 } : p)));

        const updates: Partial<FileHashResult> = { progress: 100 };
        if (algos.md5) updates.md5 = await hashFileMd5(buffer);
        if (algos.sha1) updates.sha1 = await hashFileSha1(buffer);
        if (algos.sha256) updates.sha256 = await hashFileSha256(buffer);
        if (algos.sha512) updates.sha512 = await hashFileSha512(buffer);

        setFiles(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
      } catch (err) {
        toast.error(`Error hashing ${f.name}`);
      }
    }
    toast.success(`Computed checksums for ${incoming.length} file(s)`);
  };

  const handleDownloadReport = () => {
    if (files.length === 0) return;
    let report = 'Whysogood File Integrity & Checksum Report\n';
    report += `Generated: ${new Date().toUTCString()}\n`;
    report += '===================================================\n\n';

    files.forEach((f, idx) => {
      report += `[${idx + 1}] File: ${f.name}\n`;
      report += `Size: ${formatFileSize(f.size)} (${f.size} bytes)\n`;
      if (f.md5) report += `MD5:    ${f.md5}\n`;
      if (f.sha1) report += `SHA-1:  ${f.sha1}\n`;
      if (f.sha256) report += `SHA-256: ${f.sha256}\n`;
      if (f.sha512) report += `SHA-512: ${f.sha512}\n`;
      report += '\n---------------------------------------------------\n\n';
    });

    const blob = new Blob([report], { type: 'text/plain' });
    downloadBlob(blob, 'file_checksums_report.txt');
    toast.success('Downloaded hash report');
  };

  const handleCopyHash = (text: string, id: string) => {
    copyToClipboard(text);
    setCopiedId(id);
    toast.success('Checksum copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const checkMatch = (hashVal?: string) => {
    if (!compareHash.trim() || !hashVal) return null;
    return hashVal.toLowerCase() === compareHash.trim().toLowerCase();
  };

  const confirmClearAll = () => {
    setFiles([]);
    setShowClearConfirm(false);
    toast.success('Cleared all files');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Card */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              File Checksum & Hash Generator
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Compute cryptographic MD5, SHA-1, SHA-256, and SHA-512 hashes for local files up to any size with zero server uploads.
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

        {/* Algorithm Toggles */}
        <div className="c-field">
          <label className="c-field__label">Active Cryptographic Hash Algorithms</label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-body-sm)' }}>
              <input
                type="checkbox"
                checked={algos.md5}
                onChange={e => setAlgos(prev => ({ ...prev, md5: e.target.checked }))}
              />
              <span>MD5 (128-bit)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-body-sm)' }}>
              <input
                type="checkbox"
                checked={algos.sha1}
                onChange={e => setAlgos(prev => ({ ...prev, sha1: e.target.checked }))}
              />
              <span>SHA-1 (160-bit)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-body-sm)' }}>
              <input
                type="checkbox"
                checked={algos.sha256}
                onChange={e => setAlgos(prev => ({ ...prev, sha256: e.target.checked }))}
              />
              <span>SHA-256 (256-bit)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-body-sm)' }}>
              <input
                type="checkbox"
                checked={algos.sha512}
                onChange={e => setAlgos(prev => ({ ...prev, sha512: e.target.checked }))}
              />
              <span>SHA-512 (512-bit)</span>
            </label>
          </div>
        </div>

        {/* Compare Hash Input */}
        <div className="c-field">
          <label className="c-field__label">Integrity Verification Check (Optional)</label>
          <input
            className="c-field__input"
            type="text"
            placeholder="Paste expected checksum to compare with generated hashes..."
            value={compareHash}
            onChange={e => setCompareHash(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <span className="c-field__hint">
            Case-insensitive match check automatically highlights matching algorithms in green below.
          </span>
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
            padding: '32px 20px',
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
              Drop files here or click to browse
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', marginTop: '4px' }}>
              Supports any file type (images, videos, executables, archives). Up to 10 files per batch.
            </div>
          </div>
        </div>

        {/* Primary Action Button (Rule 2: strictly max 1 primary button per view) */}
        {files.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              className="c-btn c-btn--primary"
              onClick={handleDownloadReport}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={18} />
              Download Checksum Report (.txt)
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clear All (Rule 10: destructive actions require confirmation) */}
      {showClearConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Clear Hashed Files?</h2>
              <button
                className="modal-close"
                onClick={() => setShowClearConfirm(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove all hashed files and their computed checksums?</p>
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
                Clear Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Results List */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Hashed Files ({files.length})
            </h3>
          </div>

          {files.map(f => (
            <div key={f.id} className="c-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileCheck size={20} style={{ color: 'var(--brand)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 'var(--text-body)' }}>
                    {f.name}
                  </span>
                </div>
                <span className="c-badge c-badge--neutral">
                  {formatFileSize(f.size)} ({f.size.toLocaleString()} bytes)
                </span>
              </div>

              {/* Progress bar if still calculating */}
              {f.progress < 100 && (
                <div style={{ height: '6px', width: '100%', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-3)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${f.progress}%`, backgroundColor: 'var(--brand)', transition: 'width 0.2s ease' }} />
                </div>
              )}

              {/* Hash Outputs */}
              {f.progress === 100 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(['md5', 'sha1', 'sha256', 'sha512'] as const)
                    .filter(algo => algos[algo])
                    .map(algo => {
                      const hashVal = f[algo];
                      if (!hashVal) return null;
                      const match = checkMatch(hashVal);
                      const copyKey = `${f.id}-${algo}`;

                      return (
                        <div key={algo} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase' }}>
                              {algo.replace('sha', 'SHA-')}
                            </span>
                            {match !== null && (
                              match ? (
                                <span className="c-badge c-badge--pos">
                                  <span className="c-badge-dot" /> Match Verified
                                </span>
                              ) : (
                                <span className="c-badge c-badge--neg">
                                  <span className="c-badge-dot" /> Mismatch
                                </span>
                              )
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: 'var(--bg-3)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              gap: '8px'
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 'var(--text-caption)',
                                color: 'var(--ink)',
                                wordBreak: 'break-all',
                                userSelect: 'all'
                              }}
                            >
                              {hashVal}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyHash(hashVal, copyKey)}
                            >
                              {copiedId === copyKey ? (
                                <Check size={14} style={{ color: 'var(--pos)' }} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Security Privacy Callout */}
      <div className="c-alert c-alert--pos">
        <ShieldCheck size={20} />
        <div>
          <strong>100% Private Client-Side Processing:</strong> All file byte streams are digested locally inside your web browser using HTML5 FileAPI and native Web Crypto acceleration. Files never leave your local device.
        </div>
      </div>
    </div>
  );
}
