'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { formatJs } from '@/lib/developer/formatters';
import { SAMPLE_JS } from '@/lib/developer/samples';
import { Select } from '@/components/ui/Select';

export default function JsFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentOption, setIndentOption] = useState<string>('2');
  const [quoteStyle, setQuoteStyle] = useState<'single' | 'double'>('single');
  const [semicolonOption, setSemicolonOption] = useState<'always' | 'remove'>('always');
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleFormat = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const isTab = indentOption === 'tab';
    const indentSize = isTab ? 2 : parseInt(indentOption, 10);
    const result = formatJs(input, {
      indentType: isTab ? 'tabs' : 'spaces',
      indentSize,
      quotes: quoteStyle,
      semicolons: semicolonOption === 'always',
    });

    setOutput(result.formatted);
    setError(result.error || null);
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_JS);
    const result = formatJs(SAMPLE_JS, {
      indentType: 'spaces',
      indentSize: 2,
      quotes: quoteStyle,
      semicolons: semicolonOption === 'always',
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
        <span>Quotes:</span>
        <Select
          selectSize="sm"
          fullWidth={false}
          value={quoteStyle}
          onChange={(e) => setQuoteStyle(e.target.value as 'single' | 'double')}
          options={[
            { value: 'single', label: "Single (')" },
            { value: 'double', label: 'Double (")' },
          ]}
          style={{ width: 110 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
        <span>Semicolons:</span>
        <Select
          selectSize="sm"
          fullWidth={false}
          value={semicolonOption}
          onChange={(e) => setSemicolonOption(e.target.value as 'always' | 'remove')}
          options={[
            { value: 'always', label: 'Always (;)' },
            { value: 'remove', label: 'Omit' },
          ]}
          style={{ width: 110 }}
        />
      </div>
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input JavaScript / TypeScript"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write JavaScript / TypeScript code here..."
      outputLabel="Formatted JS"
      outputValue={output}
      outputPlaceholder="Formatted JavaScript will appear here..."
      onExecute={handleFormat}
      executeLabel="Format JS"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename="formatted.js"
      downloadMimeType="application/javascript"
    />
  );
}
