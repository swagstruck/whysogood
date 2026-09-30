'use client';

import React, { useState, useMemo } from 'react';
import { jsonToCsvData } from '@/lib/data/transpilers';
import { SAMPLE_ECOMMERCE_ORDERS_JSON } from '@/lib/data/samples';
import { DataTablePreview } from '../common/DataTablePreview';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Sparkles,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import type { JsonToCsvDataOptions } from '@/lib/data/types';

export default function JsonToCsvDataTool() {
  const [jsonInput, setJsonInput] = useState<string>(SAMPLE_ECOMMERCE_ORDERS_JSON);
  const [delimiter, setDelimiter] = useState<string>(',');
  const [flattenObjects, setFlattenObjects] = useState<boolean>(true);
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  const [quoteStyle, setQuoteStyle] = useState<'as-needed' | 'always' | 'none'>('as-needed');

  const toast = useToast();

  const options: JsonToCsvDataOptions = useMemo(() => ({
    delimiter,
    flattenObjects,
    includeHeaders,
    quoteStyle,
  }), [delimiter, flattenObjects, includeHeaders, quoteStyle]);

  const result = useMemo(() => {
    return jsonToCsvData(jsonInput, options);
  }, [jsonInput, options]);

  const handleLoadSample = () => {
    setJsonInput(SAMPLE_ECOMMERCE_ORDERS_JSON);
    toast.success('Loaded e-commerce orders JSON sample');
  };

  const handleClear = () => {
    setJsonInput('');
  };

  const metricsBadge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--brand-subtle)', color: 'var(--brand)', fontWeight: 600 }}>
        Rows: {result.rowCount.toLocaleString()}
      </span>
      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--pos-subtle)', color: 'var(--pos)', fontWeight: 600 }}>
        Columns: {result.columnCount}
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
            Source JSON Data Array
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
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste JSON array of objects here..."
          rows={6}
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

        {/* Options Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Delimiter:</span>
              <div style={{ width: 110 }}>
                <Select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  options={[
                    { label: 'Comma (,)', value: ',' },
                    { label: 'Semicolon (;)', value: ';' },
                    { label: 'Tab (\\t)', value: '\t' },
                    { label: 'Pipe (|)', value: '|' },
                  ]}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={flattenObjects}
                onChange={(e) => setFlattenObjects(e.target.checked)}
              />
              <span>Flatten Nested Objects (dot notation)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
              />
              <span>Include Headers</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {result.error && (
        <div
          style={{
            background: 'var(--neg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--neg)',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>
            {result.error.message} (Line {result.error.line}, Column {result.error.column})
          </span>
        </div>
      )}

      {/* Output Table Preview */}
      <DataTablePreview
        title="Converted CSV Output"
        headers={result.headers}
        rows={result.rows}
        rawCsv={result.csv}
        downloadFilename="converted_data.csv"
        metricsBadge={metricsBadge}
      />
    </div>
  );
}
