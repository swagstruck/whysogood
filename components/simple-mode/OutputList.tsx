'use client';
import React from 'react';
import { Trash2, Archive } from 'lucide-react';
import type { SimpleModeOutput } from '@/lib/simpleMode/types';
import { OutputCard } from './OutputCard';

interface OutputListProps {
  outputs: SimpleModeOutput[];
  onDownload: (output: SimpleModeOutput) => void;
  onUseAsInput: (output: SimpleModeOutput) => void;
  onRemove: (id: string) => void;
  onDownloadAll: () => void;
  onClearAll: () => void;
  isZipping?: boolean;
}

export function OutputList({
  outputs,
  onDownload,
  onUseAsInput,
  onRemove,
  onDownloadAll,
  onClearAll,
  isZipping = false,
}: OutputListProps) {
  if (outputs.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* Action Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Workbench Outputs
          </h3>
          <span
            className="c-badge c-badge--brand"
            style={{
              padding: '2px 8px',
              fontSize: 11,
              borderRadius: 'var(--radius-full)',
            }}
          >
            {outputs.length} {outputs.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={onDownloadAll}
            disabled={isZipping}
            className="c-btn c-btn--primary c-btn--sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              height: 34,
            }}
            title="Download all outputs packaged as a single .zip file"
          >
            <Archive size={14} />
            <span>{isZipping ? 'Bundling ZIP…' : 'Download All (.zip)'}</span>
          </button>

          <button
            onClick={onClearAll}
            className="c-btn c-btn--secondary c-btn--sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              height: 34,
              color: 'var(--ink-2)',
            }}
            title="Clear all generated outputs from list"
          >
            <Trash2 size={14} />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Outputs Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {outputs.map(output => (
          <OutputCard
            key={output.id}
            output={output}
            onDownload={onDownload}
            onUseAsInput={onUseAsInput}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
