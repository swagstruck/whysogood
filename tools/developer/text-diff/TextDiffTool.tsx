'use client';

import React, { useState, useMemo } from 'react';
import { computeDiff } from '@/lib/developer/utilities';
import { SAMPLE_DIFF_ORIGINAL, SAMPLE_DIFF_MODIFIED } from '@/lib/developer/samples';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import {
  Copy,
  Download,
  Trash2,
  Sparkles,
  Columns,
  List,
  Plus,
  Minus,
  Check,
} from 'lucide-react';

export default function TextDiffTool() {
  const [original, setOriginal] = useState(SAMPLE_DIFF_ORIGINAL);
  const [modified, setModified] = useState(SAMPLE_DIFF_MODIFIED);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [copied, setCopied] = useState(false);

  const toast = useToast();

  const diffResult = useMemo(() => {
    return computeDiff(original, modified, { ignoreWhitespace, ignoreCase });
  }, [original, modified, ignoreWhitespace, ignoreCase]);

  const handleCopyUnified = async () => {
    const text = diffResult.chunks
      .map((c) => {
        const prefix = c.type === 'added' ? '+ ' : c.type === 'removed' ? '- ' : '  ';
        return prefix + c.value;
      })
      .join('\n');
    try {
      await copyToClipboard(text);
      setCopied(true);
      toast.success('Diff copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    const text = diffResult.chunks
      .map((c) => {
        const prefix = c.type === 'added' ? '+ ' : c.type === 'removed' ? '- ' : '  ';
        return prefix + c.value;
      })
      .join('\n');
    downloadBlob(new Blob([text], { type: 'text/plain' }), 'diff.patch');
    toast.success('Downloaded diff.patch');
  };

  const handleLoadSample = () => {
    setOriginal(SAMPLE_DIFF_ORIGINAL);
    setModified(SAMPLE_DIFF_MODIFIED);
    toast.success('Loaded sample texts');
  };

  const handleClear = () => {
    setOriginal('');
    setModified('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Control Bar */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg, #09090B)',
              borderRadius: 8,
              padding: 2,
              border: '1px solid var(--border, #27272A)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'side-by-side' ? 'var(--brand, #6060E8)' : 'transparent',
                color: viewMode === 'side-by-side' ? '#FFFFFF' : 'var(--ink-2, #A1A1AA)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Columns size={13} />
              <span>Side by Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'unified' ? 'var(--brand, #6060E8)' : 'transparent',
                color: viewMode === 'unified' ? '#FFFFFF' : 'var(--ink-2, #A1A1AA)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <List size={13} />
              <span>Unified</span>
            </button>
          </div>

          {/* Options */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
            />
            <span>Ignore Whitespace</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
            />
            <span>Ignore Case</span>
          </label>
        </div>

        {/* Diff Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', fontWeight: 600 }}>
            +{diffResult.summary.added} additions
          </span>
          <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 600 }}>
            -{diffResult.summary.removed} deletions
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleLoadSample}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Load Sample
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 size={14} style={{ marginRight: 6 }} />
            Clear
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopyUnified}>
            {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
            Copy Patch
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} style={{ marginRight: 6 }} />
            Download
          </Button>
        </div>
      </div>

      {/* Input Editors Split */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>Original Text</span>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Paste original source text here..."
            rows={8}
            style={{
              width: '100%',
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 8,
              padding: 10,
              color: 'var(--ink, #FFFFFF)',
              fontSize: 13,
              fontFamily: 'var(--font-mono, monospace)',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>

        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>Modified Text</span>
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            placeholder="Paste modified text here..."
            rows={8}
            style={{
              width: '100%',
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 8,
              padding: 10,
              color: 'var(--ink, #FFFFFF)',
              fontSize: 13,
              fontFamily: 'var(--font-mono, monospace)',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      {/* Diff Output Viewer */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
          Visual Diff Output
        </span>

        <div
          style={{
            background: 'var(--bg, #09090B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 8,
            overflow: 'auto',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {diffResult.chunks.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2, #A1A1AA)' }}>
              No text to compare. Paste text into Original and Modified boxes above.
            </div>
          ) : (
            diffResult.chunks.map((chunk, idx) => {
              const isAdded = chunk.type === 'added';
              const isRemoved = chunk.type === 'removed';
              const bg = isAdded
                ? 'rgba(34, 197, 94, 0.12)'
                : isRemoved
                ? 'rgba(239, 68, 68, 0.12)'
                : 'transparent';
              const color = isAdded
                ? '#86EFAC'
                : isRemoved
                ? '#FCA5A5'
                : 'var(--ink, #E4E4E7)';
              const sign = isAdded ? '+' : isRemoved ? '-' : ' ';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    background: bg,
                    color: color,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      padding: '2px 8px',
                      color: 'var(--ink-2, #71717A)',
                      textAlign: 'right',
                      userSelect: 'none',
                      borderRight: '1px solid var(--border, #27272A)',
                    }}
                  >
                    {chunk.lineNumOld || ''}
                  </span>
                  <span
                    style={{
                      width: 44,
                      padding: '2px 8px',
                      color: 'var(--ink-2, #71717A)',
                      textAlign: 'right',
                      userSelect: 'none',
                      borderRight: '1px solid var(--border, #27272A)',
                    }}
                  >
                    {chunk.lineNumNew || ''}
                  </span>
                  <span
                    style={{
                      width: 24,
                      textAlign: 'center',
                      userSelect: 'none',
                      fontWeight: 700,
                    }}
                  >
                    {sign}
                  </span>
                  <span style={{ padding: '2px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1 }}>
                    {chunk.value}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
