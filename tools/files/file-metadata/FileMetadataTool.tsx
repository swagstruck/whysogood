'use client';

import React, { useState, useRef, useId } from 'react';
import { Upload, Copy, Download, Trash2, Check, FileText, Info, ShieldCheck, Image as ImageIcon, Music, Video, Code } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob, formatFileSize } from '@/lib/utils';
import { extractFileMetadata, FileMetadata } from '@/lib/files/engines';

interface MediaInfo {
  width?: number;
  height?: number;
  aspectRatio?: string;
  duration?: number;
  textStats?: {
    lines: number;
    words: number;
    characters: number;
  };
  headerBytes?: string;
}

export default function FileMetadataTool() {
  const fileInputId = useId();
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const meta = extractFileMetadata(file);
    setMetadata(meta);
    setMediaInfo(null);

    // Read header bytes (first 16 bytes)
    const slice = file.slice(0, 16);
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      setMediaInfo(prev => ({ ...(prev || {}), headerBytes: hex }));
    };
    reader.readAsArrayBuffer(slice);

    // Image dimension inspection
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(img.naturalWidth, img.naturalHeight);
        const ratio = divisor > 0 ? `${img.naturalWidth / divisor}:${img.naturalHeight / divisor}` : 'N/A';

        setMediaInfo(prev => ({
          ...(prev || {}),
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: ratio
        }));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }

    // Audio/Video duration inspection
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
      media.preload = 'metadata';
      media.onloadedmetadata = () => {
        setMediaInfo(prev => ({
          ...(prev || {}),
          duration: media.duration,
          width: 'videoWidth' in media && media.videoWidth ? media.videoWidth : undefined,
          height: 'videoHeight' in media && media.videoHeight ? media.videoHeight : undefined
        }));
        URL.revokeObjectURL(url);
      };
      media.src = url;
    }

    // Text stats inspection (for text, code, json, markdown)
    if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.js')
    ) {
      const textReader = new FileReader();
      textReader.onload = () => {
        const text = textReader.result as string;
        const lines = text.split(/\r\n|\r|\n/).length;
        const words = (text.match(/\S+/g) || []).length;
        setMediaInfo(prev => ({
          ...(prev || {}),
          textStats: {
            lines,
            words,
            characters: text.length
          }
        }));
      };
      textReader.readAsText(file.slice(0, 1024 * 512)); // read first 512KB for stats
    }

    toast.success(`Loaded metadata for ${file.name}`);
  };

  const handleCopyJson = () => {
    if (!metadata) return;
    const combined = {
      ...metadata,
      media: mediaInfo || {}
    };
    copyToClipboard(JSON.stringify(combined, null, 2));
    setCopied(true);
    toast.success('Metadata JSON copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!metadata) return;
    let txt = 'Whysogood File Metadata Analysis\n';
    txt += `Timestamp: ${new Date().toISOString()}\n`;
    txt += '===================================================\n\n';
    txt += `File Name:       ${metadata.name}\n`;
    txt += `File Extension:  ${metadata.extension || 'None'}\n`;
    txt += `MIME Type:       ${metadata.type}\n`;
    txt += `Size (Bytes):    ${metadata.size}\n`;
    txt += `Formatted Size:  ${metadata.formattedSize}\n`;
    txt += `Last Modified:   ${metadata.lastModified} (Epoch: ${metadata.lastModifiedTimestamp})\n`;

    if (mediaInfo?.width && mediaInfo?.height) {
      txt += `Dimensions:      ${mediaInfo.width} x ${mediaInfo.height} px\n`;
      txt += `Aspect Ratio:    ${mediaInfo.aspectRatio || 'N/A'}\n`;
    }
    if (mediaInfo?.duration) {
      txt += `Media Duration:  ${mediaInfo.duration.toFixed(2)} seconds\n`;
    }
    if (mediaInfo?.textStats) {
      txt += `Text Lines:      ${mediaInfo.textStats.lines}\n`;
      txt += `Text Words:      ${mediaInfo.textStats.words}\n`;
      txt += `Characters:      ${mediaInfo.textStats.characters}\n`;
    }
    if (mediaInfo?.headerBytes) {
      txt += `Header Bytes:    ${mediaInfo.headerBytes}\n`;
    }

    const blob = new Blob([txt], { type: 'text/plain' });
    downloadBlob(blob, `${metadata.name}_metadata.txt`);
    toast.success('Downloaded metadata text report');
  };

  const handleClear = () => {
    setMetadata(null);
    setMediaInfo(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Upload Card */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              File Metadata Inspector
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Inspect detailed file header signatures, dimensions, MIME declarations, size metrics, and timestamps client-side.
            </p>
          </div>
          {metadata && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Trash2 size={16} /> Clear File
              </Button>
            </div>
          )}
        </div>

        {/* Dropzone */}
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
              {metadata ? 'Click or drop to inspect another file' : 'Click or drag any file to view metadata'}
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', marginTop: '4px' }}>
              Supports documents, photos, audio, video, archives, code, and binary executables.
            </div>
          </div>
        </div>

        {/* Primary Action Button (Rule 2: strictly max 1 primary button per view) */}
        {metadata && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="c-btn c-btn--primary"
              onClick={handleCopyJson}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              Copy Metadata JSON
            </button>
            <button
              type="button"
              className="c-btn c-btn--secondary"
              onClick={handleDownloadTxt}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={18} />
              Download Report (.txt)
            </button>
          </div>
        )}
      </div>

      {/* Metadata Overview Metrics Cards */}
      {metadata && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>File Size</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                {metadata.formattedSize}
              </div>
              <div className="metric-delta" style={{ color: 'var(--ink-3)', fontSize: 'var(--text-caption)', marginTop: '4px' }}>
                {metadata.size.toLocaleString()} bytes
              </div>
            </div>

            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>File Extension</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                {metadata.extension ? `.${metadata.extension.toUpperCase()}` : 'None'}
              </div>
              <div className="metric-delta" style={{ color: 'var(--brand)', fontSize: 'var(--text-caption)', marginTop: '4px' }}>
                Format classification
              </div>
            </div>

            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>MIME Declaration</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--ink)', marginTop: '4px', wordBreak: 'break-all' }}>
                {metadata.type}
              </div>
              <div className="metric-delta" style={{ color: 'var(--ink-3)', fontSize: 'var(--text-caption)', marginTop: '4px' }}>
                Browser file.type
              </div>
            </div>

            <div className="metric-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Last Modified</div>
              <div className="metric-value" style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                {metadata.lastModified}
              </div>
              <div className="metric-delta" style={{ color: 'var(--ink-3)', fontSize: 'var(--text-caption)', marginTop: '4px' }}>
                Epoch: {metadata.lastModifiedTimestamp}
              </div>
            </div>
          </div>

          {/* Detailed Metadata Grid */}
          <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Attribute Breakdown
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase' }}>File Name</div>
                <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink)', fontWeight: 500, marginTop: '4px', wordBreak: 'break-all' }}>{metadata.name}</div>
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase' }}>Magic Header Bytes</div>
                <div style={{ fontSize: 'var(--text-caption)', fontFamily: 'var(--font-mono)', color: 'var(--brand)', marginTop: '4px', wordBreak: 'break-all' }}>
                  {mediaInfo?.headerBytes || 'Reading...'}
                </div>
              </div>

              {mediaInfo?.width && mediaInfo?.height && (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase' }}>Visual Dimensions</div>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink)', fontWeight: 500, marginTop: '4px' }}>
                    {mediaInfo.width} × {mediaInfo.height} px ({mediaInfo.aspectRatio} ratio)
                  </div>
                </div>
              )}

              {mediaInfo?.duration && (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase' }}>Playback Duration</div>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink)', fontWeight: 500, marginTop: '4px' }}>
                    {mediaInfo.duration.toFixed(2)}s ({Math.floor(mediaInfo.duration / 60)}m {Math.floor(mediaInfo.duration % 60)}s)
                  </div>
                </div>
              )}

              {mediaInfo?.textStats && (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase' }}>Text Metrics</div>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink)', fontWeight: 500, marginTop: '4px' }}>
                    {mediaInfo.textStats.lines.toLocaleString()} lines • {mediaInfo.textStats.words.toLocaleString()} words • {mediaInfo.textStats.characters.toLocaleString()} chars
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="c-alert c-alert--pos">
        <ShieldCheck size={20} />
        <div>
          <strong>Local Inspection Only:</strong> File properties, timestamps, and magic byte signatures are accessed directly via the client-side Web File API. Your files are never uploaded to any remote server.
        </div>
      </div>
    </div>
  );
}
