'use client';

import React, { useState, useMemo } from 'react';
import { cleanCsv } from '@/lib/data/csvEngine';
import { SAMPLE_EMPLOYEE_ROSTER_CSV } from '@/lib/data/samples';
import { DataTablePreview } from '../common/DataTablePreview';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Sparkles,
  Trash2,
  Eraser,
  Filter,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import type { CsvCleanerOptions } from '@/lib/data/types';

export default function CsvCleanerTool() {
  const [inputCsv, setInputCsv] = useState<string>(SAMPLE_EMPLOYEE_ROSTER_CSV);
  const [outputDelimiter, setOutputDelimiter] = useState<string>(',');
  const [trimWhitespace, setTrimWhitespace] = useState<boolean>(true);
  const [removeBlankRows, setRemoveBlankRows] = useState<boolean>(true);
  const [repairUnevenRows, setRepairUnevenRows] = useState<boolean>(true);
  const [normalizeLineBreaks, setNormalizeLineBreaks] = useState<boolean>(true);

  const toast = useToast();

  const options: CsvCleanerOptions = useMemo(() => ({
    outputDelimiter,
    trimWhitespace,
    removeBlankRows,
    repairUnevenRows,
    normalizeLineBreaks,
  }), [outputDelimiter, trimWhitespace, removeBlankRows, repairUnevenRows, normalizeLineBreaks]);

  const cleanResult = useMemo(() => {
    return cleanCsv(inputCsv, options);
  }, [inputCsv, options]);

  const handleLoadSample = () => {
    setInputCsv(SAMPLE_EMPLOYEE_ROSTER_CSV);
    toast.success('Loaded employee roster sample');
  };

  const handleClear = () => {
    setInputCsv('');
  };

  const metricsBadge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'rgba(96, 96, 232, 0.15)', color: 'var(--brand, #6060E8)', fontWeight: 600 }}>
        Rows: {cleanResult.metrics.cleanedRowCount.toLocaleString()}
      </span>
      {cleanResult.metrics.blankRowsRemoved > 0 && (
        <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 600 }}>
          Blank rows removed: {cleanResult.metrics.blankRowsRemoved}
        </span>
      )}
      {cleanResult.metrics.fieldsTrimmed > 0 && (
        <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', fontWeight: 600 }}>
          Fields trimmed: {cleanResult.metrics.fieldsTrimmed}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Input & Cleaning Controls */}
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
          placeholder="Paste CSV text here, or drag & drop a file..."
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

        {/* Cleaning Options Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            paddingTop: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={trimWhitespace}
                onChange={(e) => setTrimWhitespace(e.target.checked)}
              />
              <span>Trim Cell Spaces</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={removeBlankRows}
                onChange={(e) => setRemoveBlankRows(e.target.checked)}
              />
              <span>Remove Blank Rows</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={repairUnevenRows}
                onChange={(e) => setRepairUnevenRows(e.target.checked)}
              />
              <span>Repair Uneven Columns</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={normalizeLineBreaks}
                onChange={(e) => setNormalizeLineBreaks(e.target.checked)}
              />
              <span>Normalize Linebreaks (LF)</span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)' }}>Output Delimiter:</span>
            <div style={{ width: 110 }}>
              <Select
                value={outputDelimiter}
                onChange={(e) => setOutputDelimiter(e.target.value)}
                options={[
                  { label: 'Comma (,)', value: ',' },
                  { label: 'Semicolon (;)', value: ';' },
                  { label: 'Tab (\\t)', value: '\t' },
                  { label: 'Pipe (|)', value: '|' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Alert */}
      {cleanResult.error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#F87171',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>
            {cleanResult.error.message} (Line {cleanResult.error.line}, Column {cleanResult.error.column})
          </span>
        </div>
      )}

      {/* Output Data Table Preview */}
      <DataTablePreview
        title="Cleaned CSV Preview"
        headers={cleanResult.headers}
        rows={cleanResult.rows}
        rawCsv={cleanResult.output}
        downloadFilename="cleaned_data.csv"
        metricsBadge={metricsBadge}
      />
    </div>
  );
}
