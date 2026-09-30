'use client';

import React, { useState, useMemo } from 'react';
import { yamlToJson } from '@/lib/data/transpilers';
import { SAMPLE_KUBERNETES_DEPLOYMENT_YAML } from '@/lib/data/samples';
import { DeveloperSplitPane } from '@/tools/developer/common/DeveloperSplitPane';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function YamlToJsonTool() {
  const [yamlInput, setYamlInput] = useState<string>(SAMPLE_KUBERNETES_DEPLOYMENT_YAML);
  const [indent, setIndent] = useState<number>(2);
  const [minify, setMinify] = useState<boolean>(false);
  const [sortKeys, setSortKeys] = useState<boolean>(false);

  const result = useMemo(() => {
    return yamlToJson(yamlInput, {
      indent: minify ? 0 : indent,
      minify,
      sortKeys,
    });
  }, [yamlInput, indent, minify, sortKeys]);

  const handleLoadSample = () => {
    setYamlInput(SAMPLE_KUBERNETES_DEPLOYMENT_YAML);
  };

  const handleClear = () => {
    setYamlInput('');
  };

  const optionsToolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Indent:</span>
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

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={minify}
          onChange={(e) => setMinify(e.target.checked)}
        />
        <span>Minify JSON</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
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
      inputLabel="YAML Source Input"
      inputValue={yamlInput}
      onInputChange={setYamlInput}
      inputPlaceholder="Paste or write YAML code here..."
      outputLabel="Converted JSON Output"
      outputValue={result.json}
      outputPlaceholder="JSON output will appear here..."
      onExecute={() => {}}
      executeLabel="Transpile"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      downloadFilename="converted.json"
      downloadMimeType="application/json"
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
