'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { formatHtml } from '@/lib/developer/formatters';
import { SAMPLE_HTML } from '@/lib/developer/samples';
import { Select } from '@/components/ui/Select';

export default function HtmlFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentOption, setIndentOption] = useState<string>('2');
  const [quoteStyle, setQuoteStyle] = useState<'double' | 'single'>('double');
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleFormat = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const isTab = indentOption === 'tab';
    const indentSize = isTab ? 2 : parseInt(indentOption, 10);
    const result = formatHtml(input, {
      indentType: isTab ? 'tabs' : 'spaces',
      indentSize,
      quotes: quoteStyle,
    });

    setOutput(result.formatted);
    setError(result.error || null);
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_HTML);
    const result = formatHtml(SAMPLE_HTML, {
      indentType: 'spaces',
      indentSize: 2,
      quotes: quoteStyle,
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
          onChange={(e) => setQuoteStyle(e.target.value as 'double' | 'single')}
          options={[
            { value: 'double', label: 'Double (")' },
            { value: 'single', label: "Single (')" },
          ]}
          style={{ width: 115 }}
        />
      </div>
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input HTML"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write raw HTML markup here..."
      outputLabel="Formatted HTML"
      outputValue={output}
      outputPlaceholder="Formatted HTML will appear here..."
      onExecute={handleFormat}
      executeLabel="Format HTML"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename="formatted.html"
      downloadMimeType="text/html"
    />
  );
}
