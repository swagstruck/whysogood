'use client';

import React, { useState, useRef, useId } from 'react';
import { Upload, Search, Check, AlertTriangle, Copy, ShieldCheck, Binary, FileCheck, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { readFileAsArrayBuffer, copyToClipboard } from '@/lib/utils';
import { detectMimeBySignature, MimeDetectionResult, searchMimeDatabase, COMMON_MIME_TYPES, MimeTypeEntry } from '@/lib/files/engines';

export default function MimeCheckerTool() {
  const fileInputId = useId();
  const [result, setResult] = useState<MimeDetectionResult | null>(null);
  const [reportedMime, setReportedMime] = useState<string>('');
  const [reportedExt, setReportedExt] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setFileName(file.name);
    setReportedMime(file.type || 'unknown');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    setReportedExt(ext);

    try {
      const buffer = await readFileAsArrayBuffer(file);
      const det = detectMimeBySignature(buffer);
      setResult(det);
      toast.success(`Analyzed signature for ${file.name}`);
    } catch {
      toast.error('Failed to read file bytes');
    }
  };

  const extMatch = result && reportedExt
    ? result.extension === reportedExt ||
      (result.extension === 'jpg' && reportedExt === 'jpeg') ||
      (result.extension === 'zip' && ['docx', 'xlsx', 'pptx', 'jar', 'apk'].includes(reportedExt))
    : false;

  const handleCopySummary = () => {
    if (!result) return;
    const summary = [
      `File: ${fileName}`,
      `Detected MIME: ${result.detected} (${result.description})`,
      `Reported MIME: ${reportedMime}`,
      `Detected Extension: .${result.extension}`,
      `Reported Extension: .${reportedExt}`,
      `Integrity: ${extMatch ? 'Match' : 'Mismatch'}`,
      `Signature Bytes: ${result.headerBytes}`
    ].join('\n');

    copyToClipboard(summary);
    setCopied(true);
    toast.success('MIME analysis copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const searchResults: MimeTypeEntry[] = lookupQuery.trim()
    ? searchMimeDatabase(lookupQuery)
    : COMMON_MIME_TYPES.slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Upload & Inspector Card */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            MIME Type & File Signature Inspector
          </h2>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
            Determine the true MIME type and format of any file by inspecting its binary magic byte signatures to detect renamed or spoofed files.
          </p>
        </div>

        {/* Upload Zone */}
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
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
              {fileName ? `Loaded: ${fileName} (Click to change)` : 'Drop file here or click to check real MIME type'}
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', marginTop: '4px' }}>
              Inspects first 16–32 magic bytes to reveal the true container format.
            </div>
          </div>
        </div>

        {/* Primary Action Button (Rule 2: strictly max 1 primary button per view) */}
        {result && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              className="c-btn c-btn--primary"
              onClick={handleCopySummary}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              Copy Detection Summary
            </button>
          </div>
        )}
      </div>

      {/* Analysis Results Card */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Extension Match Status Callout */}
          {extMatch ? (
            <div className="c-alert c-alert--pos">
              <Check size={20} />
              <div>
                <strong>Extension Verification Passed:</strong> The file extension (<code>.{reportedExt}</code>) matches the binary content signature (<code>{result.detected}</code>).
              </div>
            </div>
          ) : (
            <div className="c-alert c-alert--warn">
              <AlertTriangle size={20} />
              <div>
                <strong>Extension Mismatch / Potential Spoof:</strong> The reported extension (<code>.{reportedExt || 'none'}</code>) does not match the true binary signature detected in file content (<code>.{result.extension}</code> / <code>{result.detected}</code>). This file may have been renamed or masked.
              </div>
            </div>
          )}

          {/* Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>True Detected MIME</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--brand)', marginTop: '4px', wordBreak: 'break-all' }}>
                {result.detected}
              </div>
              <div className="metric-delta" style={{ marginTop: '4px' }}>
                <span className={`c-badge ${result.confidence === 'high' ? 'c-badge--pos' : 'c-badge--warn'}`}>
                  <span className="c-badge-dot" /> {result.confidence.toUpperCase()} Confidence
                </span>
              </div>
            </div>

            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Reported by Browser</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--ink)', marginTop: '4px', wordBreak: 'break-all' }}>
                {reportedMime || 'unknown'}
              </div>
              <div className="metric-delta" style={{ color: 'var(--ink-3)', fontSize: 'var(--text-caption)', marginTop: '4px' }}>
                From file.type header
              </div>
            </div>

            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>True Extension</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                .{result.extension}
              </div>
              <div className="metric-delta" style={{ color: 'var(--ink-3)', fontSize: 'var(--text-caption)', marginTop: '4px' }}>
                {result.description}
              </div>
            </div>
          </div>

          {/* Hex Magic Bytes Inspector */}
          <div className="c-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Binary size={18} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: 'var(--text-h5)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                First 16 Bytes (Magic Hex Signature)
              </h3>
            </div>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-caption)',
                color: 'var(--ink)',
                wordBreak: 'break-all',
                letterSpacing: '1px'
              }}
            >
              {result.headerBytes}
            </div>
          </div>
        </div>
      )}

      {/* Offline MIME Reference Database Search */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} style={{ color: 'var(--brand)' }} />
          <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            MIME Type Database Directory
          </h3>
        </div>

        <div className="c-field">
          <label className="c-field__label">Search by Extension, MIME Type, or Format</label>
          <input
            className="c-field__input"
            type="text"
            placeholder="e.g. pdf, image/webp, json, audio, docx..."
            value={lookupQuery}
            onChange={e => setLookupQuery(e.target.value)}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-body-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--ink-2)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                <th style={{ padding: '8px 12px' }}>MIME Type</th>
                <th style={{ padding: '8px 12px' }}>Extensions</th>
                <th style={{ padding: '8px 12px' }}>Category</th>
                <th style={{ padding: '8px 12px' }}>Description</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: 500 }}>
                      {item.mime}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                      {item.extensions.map(e => `.${e}`).join(', ')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="c-badge c-badge--brand">{item.category}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                      {item.description}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(item.mime);
                          toast.success(`Copied ${item.mime}`);
                        }}
                      >
                        <Copy size={14} /> Copy
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-3)' }}>
                    No matching MIME types found for "{lookupQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Privacy Callout */}
      <div className="c-alert c-alert--pos">
        <ShieldCheck size={20} />
        <div>
          <strong>Zero Network Transmission:</strong> Magic byte sniffing and MIME verification execute 100% in client memory. No files are transferred to external servers.
        </div>
      </div>
    </div>
  );
}
