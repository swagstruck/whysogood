'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { formatSql } from '@/lib/developer/formatters';
import { SAMPLE_SQL } from '@/lib/developer/samples';
import { Select } from '@/components/ui/Select';

export default function SqlFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentOption, setIndentOption] = useState<string>('2');
  const [keywordCase, setKeywordCase] = useState<'upper' | 'lower' | 'preserve'>('upper');
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleFormat = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const isTab = indentOption === 'tab';
    const indentSize = isTab ? 2 : parseInt(indentOption, 10);
    const result = formatSql(input, {
      indentType: isTab ? 'tabs' : 'spaces',
      indentSize,
      sqlKeywordCase: keywordCase,
    });

    setOutput(result.formatted);
    setError(result.error || null);
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_SQL);
    const result = formatSql(SAMPLE_SQL, {
      indentType: 'spaces',
      indentSize: 2,
      sqlKeywordCase: keywordCase,
    });
    setOutput(result.formatted);
    setError(null);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const optionsToolbar = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
        <span>Indent:</span>
        <Select
          selectSize="sm"
          fullWidth={false}
          value={indentOption}
          onChange={(e) => setIndentOption(e.target.value)}
          options={[
            { value: '2', label: '2 spaces' },
            { value: '4', label: '4 spaces' },
            { value: 'tab', label: 'Tab' },
          ]}
          style={{ width: 105 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
        <span>Keywords:</span>
        <Select
          selectSize="sm"
          fullWidth={false}
          value={keywordCase}
          onChange={(e) => setKeywordCase(e.target.value as 'upper' | 'lower' | 'preserve')}
          options={[
            { value: 'upper', label: 'UPPERCASE' },
            { value: 'lower', label: 'lowercase' },
            { value: 'preserve', label: 'Preserve' },
          ]}
          style={{ width: 130 }}
        />
      </div>
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input SQL Query"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write SQL queries (SELECT, INSERT, UPDATE, JOIN...) here..."
      outputLabel="Formatted SQL"
      outputValue={output}
      outputPlaceholder="Formatted SQL query will appear here..."
      onExecute={handleFormat}
      executeLabel="Format SQL"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename="query.sql"
      downloadMimeType="text/plain"
    />
  );
}
