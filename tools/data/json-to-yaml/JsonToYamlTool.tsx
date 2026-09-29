'use client';

import React, { useState, useMemo } from 'react';
import { jsonToYaml } from '@/lib/data/transpilers';
import { SAMPLE_CRM_CUSTOMERS_JSON } from '@/lib/data/samples';
import { DeveloperSplitPane } from '@/tools/developer/common/DeveloperSplitPane';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function JsonToYamlTool() {
  const [jsonInput, setJsonInput] = useState<string>(SAMPLE_CRM_CUSTOMERS_JSON);
  const [indent, setIndent] = useState<number>(2);
  const [quoteStyle, setQuoteStyle] = useState<'as-needed' | 'single' | 'double'>('as-needed');
  const [sortKeys, setSortKeys] = useState<boolean>(false);

  const result = useMemo(() => {
    return jsonToYaml(jsonInput, {
      indent,
      quoteStyle,
      sortKeys,
    });
  }, [jsonInput, indent, quoteStyle, sortKeys]);

  const handleLoadSample = () => {
    setJsonInput(SAMPLE_CRM_CUSTOMERS_JSON);
  };

  const handleClear = () => {
    setJsonInput('');
  };

  const optionsToolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)' }}>Indent:</span>
        <div style={{ width: 100 }}>
          <Select
            value={String(indent)}
            onChange={(e) => setIndent(Number(e.target.value))}
            options={[
              { label: '2 spaces', value: '2' },
              { label: '4 spaces', value: '4' },
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)' }}>Quotes:</span>
        <div style={{ width: 120 }}>
          <Select
            value={quoteStyle}
            onChange={(e) => setQuoteStyle(e.target.value as any)}
            options={[
              { label: 'As needed', value: 'as-needed' },
              { label: 'Single (\')', value: 'single' },
              { label: 'Double (")', value: 'double' },
            ]}
          />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={sortKeys}
          onChange={(e) => setSortKeys(e.target.checked)}
        />
        <span>Sort Keys</span>
      </label>
    </div>
  );

  return (
    <DeveloperSplitPane
      inputLabel="JSON Source Input"
      inputValue={jsonInput}
      onInputChange={setJsonInput}
      inputPlaceholder="Paste or write JSON here..."
      outputLabel="Converted YAML Output"
      outputValue={result.yaml}
      outputPlaceholder="YAML output will appear here..."
      onExecute={() => {}}
      executeLabel="Convert"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      downloadFilename="converted.yaml"
      downloadMimeType="text/yaml"
      error={
        result.error
          ? {
              message: result.error.message,
              line: result.error.line,
              column: result.error.column,
            }
          : null
      }
    />
  );
}
