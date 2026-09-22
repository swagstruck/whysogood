'use client';
import React from 'react';
import { Download, RefreshCw, Trash2, FileText, Code2 } from 'lucide-react';
import type { SimpleModeOutput } from '@/lib/simpleMode/types';
import { formatFileSize } from '@/lib/utils';

interface OutputCardProps {
  output: SimpleModeOutput;
  onDownload: (output: SimpleModeOutput) => void;
  onUseAsInput: (output: SimpleModeOutput) => void;
  onRemove: (id: string) => void;
}

export function OutputCard({ output, onDownload, onUseAsInput, onRemove }: OutputCardProps) {
  const isImage =
    output.mimeType.startsWith('image/') ||
    output.outputFilename.match(/\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i);

  const isPdf =
    output.mimeType === 'application/pdf' ||
    output.outputFilename.toLowerCase().endsWith('.pdf');

  const isData =
    output.mimeType === 'application/json' ||
    output.outputFilename.match(/\.(json|csv|tsv)$/i);

  const reduction =
    output.originalSize > 0 && output.size < output.originalSize
      ? +((1 - output.size / output.originalSize) * 100).toFixed(1)
      : 0;

  return (
    <div
      className="c-card"
      style={{
        padding: 16,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Preview Thumbnail */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={output.previewUrl}
              alt={output.outputFilename}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : isPdf ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <FileText size={28} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-3)' }}>PDF</span>
            </div>
          ) : isData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Code2 size={28} style={{ color: 'var(--brand)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-3)' }}>DATA</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <FileText size={28} style={{ color: 'var(--ink-2)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-3)' }}>DOC</span>
            </div>
          )}
        </div>

        {/* Info & Meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span
              className="c-badge c-badge--brand"
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}
            >
              {output.toolName}
            </span>
            {reduction > 0 && (
              <span
                className="c-badge c-badge--pos"
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}
              >
                -{reduction}%
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto' }}>
              {new Date(output.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div
            title={output.outputFilename}
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 4,
            }}
          >
            {output.outputFilename}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-2)' }}>
            <span>{formatFileSize(output.size)}</span>
            {output.originalSize > 0 && output.size !== output.originalSize && (
              <span style={{ textDecoration: 'line-through', color: 'var(--ink-3)' }}>
                {formatFileSize(output.originalSize)}
              </span>
            )}
          </div>

          {/* Additional Tool Metadata */}
          {output.metadata && Object.keys(output.metadata).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {Object.entries(output.metadata).slice(0, 3).map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-3)',
                    background: 'var(--bg-2)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          paddingTop: 8,
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => onDownload(output)}
          className="c-btn c-btn--primary c-btn--sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: '1 1 120px',
            justifyContent: 'center',
            fontSize: 12,
            height: 32,
          }}
          title="Download this file"
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        <button
          onClick={() => onUseAsInput(output)}
          className="c-btn c-btn--secondary c-btn--sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: '1 1 150px',
            justifyContent: 'center',
            fontSize: 12,
            height: 32,
          }}
          title="Load this output as active workbench input for subsequent tools"
        >
          <RefreshCw size={13} />
          <span>Use as input for next tool</span>
        </button>

        <button
          onClick={() => onRemove(output.id)}
          className="c-btn c-btn--ghost c-btn--sm"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-3)',
          }}
          title="Remove output"
          aria-label="Remove output"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
