'use client';

import React, { useState, useMemo } from 'react';
import { sortCsv, parseCsv } from '@/lib/data/csvEngine';
import { SAMPLE_EMPLOYEE_ROSTER_CSV } from '@/lib/data/samples';
import { DataTablePreview } from '../common/DataTablePreview';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Sparkles,
  Trash2,
  ArrowUpDown,
  Plus,
  X,
} from 'lucide-react';
import type { SortCriterion, SortDataType } from '@/lib/data/types';

export default function CsvSorterTool() {
  const [inputCsv, setInputCsv] = useState<string>(SAMPLE_EMPLOYEE_ROSTER_CSV);
  const [outputDelimiter, setOutputDelimiter] = useState<string>(',');
  const [criteria, setCriteria] = useState<SortCriterion[]>([
    { columnIndex: 0, direction: 'asc', type: 'auto', nullsPosition: 'bottom' },
  ]);

  const toast = useToast();

  const parsedData = useMemo(() => {
    return parseCsv(inputCsv);
  }, [inputCsv]);

  const columnOptions = useMemo(() => {
    return parsedData.headers.map((h, i) => ({
      label: h || `Column ${i + 1}`,
      value: String(i),
    }));
  }, [parsedData.headers]);

  const sortResult = useMemo(() => {
    return sortCsv(inputCsv, {
      outputDelimiter,
      criteria,
    });
  }, [inputCsv, outputDelimiter, criteria]);

  const addCriterion = () => {
    if (columnOptions.length === 0) return;
    const nextCol = criteria.length < columnOptions.length ? criteria.length : 0;
    setCriteria([
      ...criteria,
      { columnIndex: nextCol, direction: 'asc', type: 'auto', nullsPosition: 'bottom' },
    ]);
  };

  const removeCriterion = (idx: number) => {
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx: number, updates: Partial<SortCriterion>) => {
    setCriteria(criteria.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  };

  const handleLoadSample = () => {
    setInputCsv(SAMPLE_EMPLOYEE_ROSTER_CSV);
    setCriteria([{ columnIndex: 6, direction: 'desc', type: 'number', nullsPosition: 'bottom' }]); // Sort by salary desc
    toast.success('Loaded employee roster sample (sorted by salary desc)');
  };

  const handleClear = () => {
    setInputCsv('');
    setCriteria([{ columnIndex: 0, direction: 'asc', type: 'auto', nullsPosition: 'bottom' }]);
  };

  const metricsBadge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--brand-subtle)', color: 'var(--brand)', fontWeight: 600 }}>
        Rows Sorted: {sortResult.sortedRowCount.toLocaleString()}
      </span>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--pos-subtle)', color: 'var(--pos)', fontWeight: 600 }}>
        Sort Rules: {criteria.length}
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
          placeholder="Paste CSV to sort rows..."
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

        {/* Multi-Column Sort Builder */}
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
              <ArrowUpDown size={16} color="var(--brand)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Sort Criteria Hierarchy
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={addCriterion} disabled={columnOptions.length === 0}>
                <Plus size={13} style={{ marginRight: 4 }} />
                Add Sort Column
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {criteria.map((crit, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600, minWidth: 60 }}>
                  {idx === 0 ? 'Sort by:' : 'Then by:'}
                </span>

                {/* Column */}
                <div style={{ width: 180 }}>
                  <Select
                    value={String(crit.columnIndex ?? 0)}
                    onChange={(e) => updateCriterion(idx, { columnIndex: Number(e.target.value) })}
                    options={columnOptions.length > 0 ? columnOptions : [{ label: 'Column 1', value: '0' }]}
                  />
                </div>

                {/* Direction */}
                <div style={{ width: 140 }}>
                  <Select
                    value={crit.direction}
                    onChange={(e) => updateCriterion(idx, { direction: e.target.value as 'asc' | 'desc' })}
                    options={[
                      { label: 'Ascending (A-Z, 0-9)', value: 'asc' },
                      { label: 'Descending (Z-A, 9-0)', value: 'desc' },
                    ]}
                  />
                </div>

                {/* Type */}
                <div style={{ width: 120 }}>
                  <Select
                    value={crit.type || 'auto'}
                    onChange={(e) => updateCriterion(idx, { type: e.target.value as SortDataType })}
                    options={[
                      { label: 'Auto Detect', value: 'auto' },
                      { label: 'Numeric', value: 'number' },
                      { label: 'Date', value: 'date' },
                      { label: 'Text', value: 'text' },
                    ]}
                  />
                </div>

                {criteria.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeCriterion(idx)}>
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output Table Preview */}
      <DataTablePreview
        title="Sorted CSV Output"
        headers={sortResult.headers}
        rows={sortResult.rows}
        rawCsv={sortResult.output}
        downloadFilename="sorted_data.csv"
        metricsBadge={metricsBadge}
      />
    </div>
  );
}
