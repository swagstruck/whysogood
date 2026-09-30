'use client';

import React, { useState, useMemo } from 'react';
import { extractColumns, parseCsv } from '@/lib/data/csvEngine';
import { SAMPLE_EMPLOYEE_ROSTER_CSV } from '@/lib/data/samples';
import { DataTablePreview } from '../common/DataTablePreview';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Sparkles,
  Trash2,
  Columns,
  CheckSquare,
  Square,
  ArrowRight,
} from 'lucide-react';
import type { ExtractorColumnConfig } from '@/lib/data/types';

export default function CsvColumnExtractorTool() {
  const [inputCsv, setInputCsv] = useState<string>(SAMPLE_EMPLOYEE_ROSTER_CSV);
  const [outputDelimiter, setOutputDelimiter] = useState<string>(',');
  const [columnConfigs, setColumnConfigs] = useState<ExtractorColumnConfig[]>([]);

  const toast = useToast();

  // Parse headers from input
  const parsedData = useMemo(() => {
    return parseCsv(inputCsv);
  }, [inputCsv]);

  // Sync column configs when parsedData headers change
  React.useEffect(() => {
    if (parsedData.headers.length > 0) {
      setColumnConfigs(
        parsedData.headers.map((name, idx) => ({
          originalIndex: idx,
          originalName: name || `Column ${idx + 1}`,
          selected: true,
          sampleValue: parsedData.rows[0]?.[idx] || '',
        }))
      );
    } else {
      setColumnConfigs([]);
    }
  }, [parsedData.headers]);

  const extractedResult = useMemo(() => {
    return extractColumns(inputCsv, {
      outputDelimiter,
      columns: columnConfigs,
    });
  }, [inputCsv, outputDelimiter, columnConfigs]);

  const toggleSelectColumn = (idx: number) => {
    setColumnConfigs((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c))
    );
  };

  const selectAll = (selected: boolean) => {
    setColumnConfigs((prev) => prev.map((c) => ({ ...c, selected })));
  };

  const handleLoadSample = () => {
    setInputCsv(SAMPLE_EMPLOYEE_ROSTER_CSV);
    toast.success('Loaded employee roster sample');
  };

  const handleClear = () => {
    setInputCsv('');
    setColumnConfigs([]);
  };

  const selectedCount = columnConfigs.filter((c) => c.selected).length;

  const metricsBadge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--brand-subtle)', color: 'var(--brand)', fontWeight: 600 }}>
        Columns: {selectedCount} / {columnConfigs.length}
      </span>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--pos-subtle)', color: 'var(--pos)', fontWeight: 600 }}>
        Rows: {extractedResult.rows.length.toLocaleString()}
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Input Section */}
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
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
          placeholder="Paste CSV to extract specific columns..."
          rows={5}
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            color: 'var(--ink)',
            fontSize: 13,
            fontFamily: 'var(--font-mono, monospace)',
            resize: 'vertical',
            lineHeight: 1.5,
            outline: 'none',
          }}
        />

        {/* Column Selection Grid */}
        {columnConfigs.length > 0 && (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Columns size={16} color="var(--brand)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  Select Columns to Extract:
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => selectAll(true)}>
                  <CheckSquare size={13} style={{ marginRight: 4 }} />
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={() => selectAll(false)}>
                  <Square size={13} style={{ marginRight: 4 }} />
                  Deselect All
                </Button>
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
                gap: 8,
              }}
            >
              {columnConfigs.map((col, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: col.selected ? 'var(--brand-subtle)' : 'var(--bg-2)',
                    border: `1px solid ${col.selected ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={col.selected}
                    onChange={() => toggleSelectColumn(idx)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {col.originalName}
                    </span>
                    {col.sampleValue && (
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        e.g. {col.sampleValue}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Output Table Preview */}
      <DataTablePreview
        title="Extracted Columns Output"
        headers={extractedResult.headers}
        rows={extractedResult.rows}
        rawCsv={extractedResult.output}
        downloadFilename="extracted_columns.csv"
        metricsBadge={metricsBadge}
      />
    </div>
  );
}
