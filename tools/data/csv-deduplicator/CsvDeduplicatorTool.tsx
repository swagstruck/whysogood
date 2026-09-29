'use client';

import React, { useState, useMemo } from 'react';
import { deduplicateCsv, parseCsv } from '@/lib/data/csvEngine';
import { SAMPLE_ECOMMERCE_ORDERS_CSV } from '@/lib/data/samples';
import { DataTablePreview } from '../common/DataTablePreview';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Sparkles,
  Trash2,
  Filter,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { CsvDeduplicatorOptions } from '@/lib/data/types';

export default function CsvDeduplicatorTool() {
  const [inputCsv, setInputCsv] = useState<string>(SAMPLE_ECOMMERCE_ORDERS_CSV);
  const [dedupeMode, setDedupeMode] = useState<'all-columns' | 'selected-columns'>('all-columns');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'keep-first' | 'keep-last'>('keep-first');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [trimBeforeCompare, setTrimBeforeCompare] = useState<boolean>(true);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState<boolean>(false);

  const toast = useToast();

  // Extract detected headers for column selection
  const parsedHeaders = useMemo(() => {
    const parsed = parseCsv(inputCsv);
    return parsed.headers || [];
  }, [inputCsv]);

  const options: CsvDeduplicatorOptions = useMemo(() => ({
    dedupeMode,
    selectedColumns: dedupeMode === 'selected-columns' ? selectedColumns : undefined,
    strategy,
    caseSensitive,
    trimBeforeCompare,
  }), [dedupeMode, selectedColumns, strategy, caseSensitive, trimBeforeCompare]);

  const dedupResult = useMemo(() => {
    return deduplicateCsv(inputCsv, options);
  }, [inputCsv, options]);

  const toggleColumnSelection = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const handleLoadSample = () => {
    setInputCsv(SAMPLE_ECOMMERCE_ORDERS_CSV);
    toast.success('Loaded e-commerce orders sample');
  };

  const handleClear = () => {
    setInputCsv('');
    setSelectedColumns([]);
  };

  const metricsBadge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', fontWeight: 600 }}>
        Unique: {dedupResult.metrics.uniqueRowCount.toLocaleString()}
      </span>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 600 }}>
        Duplicates Removed: {dedupResult.metrics.duplicatesRemoved.toLocaleString()} ({dedupResult.metrics.duplicatePercentage}%)
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Input Section */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
            Source CSV / TSV Input
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={handleLoadSample}>
              <Sparkles size={14} style={{ marginRight: 6 }} />
              Load Sample
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 size={14} style={{ marginRight: 6 }} />
              Clear
            </Button>
          </div>
        </div>

        <textarea
          value={inputCsv}
          onChange={(e) => setInputCsv(e.target.value)}
          placeholder="Paste CSV to deduplicate rows..."
          rows={6}
          style={{
            width: '100%',
            background: 'var(--bg, #09090B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 8,
            padding: 12,
            color: 'var(--ink, #FFFFFF)',
            fontSize: 13,
            fontFamily: 'var(--font-mono, monospace)',
            resize: 'vertical',
            lineHeight: 1.5,
            outline: 'none',
          }}
        />

        {/* Deduplication Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)' }}>Scope:</span>
                <div style={{ width: 150 }}>
                  <Select
                    value={dedupeMode}
                    onChange={(val) => setDedupeMode(val as any)}
                    options={[
                      { label: 'All Columns', value: 'all-columns' },
                      { label: 'Selected Columns', value: 'selected-columns' },
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)' }}>Keep:</span>
                <div style={{ width: 140 }}>
                  <Select
                    value={strategy}
                    onChange={(val) => setStrategy(val as any)}
                    options={[
                      { label: 'First Occurrence', value: 'keep-first' },
                      { label: 'Last Occurrence', value: 'keep-last' },
                    ]}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                <span>Case Sensitive</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={trimBeforeCompare}
                  onChange={(e) => setTrimBeforeCompare(e.target.checked)}
                />
                <span>Trim Before Compare</span>
              </label>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            >
              <Eye size={13} style={{ marginRight: 6 }} />
              {showDuplicatesOnly ? 'View Deduplicated CSV' : `View Removed Duplicates (${dedupResult.duplicates.length})`}
            </Button>
          </div>

          {/* Key Columns Picker if Selected Columns Mode */}
          {dedupeMode === 'selected-columns' && parsedHeaders.length > 0 && (
            <div
              style={{
                background: 'var(--bg, #09090B)',
                border: '1px solid var(--border, #27272A)',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)', fontWeight: 600 }}>
                Select Primary Key Columns for Duplicate Detection:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {parsedHeaders.map((header) => {
                  const isChecked = selectedColumns.includes(header);
                  return (
                    <button
                      key={header}
                      type="button"
                      onClick={() => toggleColumnSelection(header)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: isChecked ? 'var(--brand, #6060E8)' : 'var(--border, #27272A)',
                        background: isChecked ? 'var(--brand, #6060E8)' : 'transparent',
                        color: isChecked ? '#FFFFFF' : 'var(--ink-2, #A1A1AA)',
                        cursor: 'pointer',
                      }}
                    >
                      {header}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Table Preview */}
      <DataTablePreview
        title={showDuplicatesOnly ? `Removed Duplicate Rows (${dedupResult.duplicates.length})` : 'Deduplicated CSV Output'}
        headers={dedupResult.headers}
        rows={showDuplicatesOnly ? dedupResult.duplicates : dedupResult.rows}
        rawCsv={showDuplicatesOnly ? dedupResult.duplicates.map((r) => r.join(',')).join('\n') : dedupResult.output}
        downloadFilename={showDuplicatesOnly ? 'removed_duplicates.csv' : 'deduplicated_data.csv'}
        metricsBadge={metricsBadge}
      />
    </div>
  );
}
