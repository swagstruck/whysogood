'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { formatCss } from '@/lib/developer/formatters';
import { SAMPLE_CSS } from '@/lib/developer/samples';
import { Select } from '@/components/ui/Select';

export default function CssFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentOption, setIndentOption] = useState<string>('2');
  const [quoteStyle, setQuoteStyle] = useState<'preserve' | 'double' | 'single'>('double');
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleFormat = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const isTab = indentOption === 'tab';
    const indentSize = isTab ? 2 : parseInt(indentOption, 10);
    const result = formatCss(input, {
      indentType: isTab ? 'tabs' : 'spaces',
      indentSize,
      quotes: quoteStyle === 'preserve' ? undefined : quoteStyle,
    });

    setOutput(result.formatted);
    setError(result.error || null);
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_CSS);
    const result = formatCss(SAMPLE_CSS, {
      indentType: 'spaces',
      indentSize: 2,
      quotes: quoteStyle === 'preserve' ? undefined : quoteStyle,
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
          onChange={(e) => setQuoteStyle(e.target.value as 'preserve' | 'double' | 'single')}
          options={[
            { value: 'double', label: 'Double (")' },
            { value: 'single', label: "Single (')" },
            { value: 'preserve', label: 'Preserve' },
          ]}
          style={{ width: 115 }}
        />
      </div>
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input CSS"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write CSS rules and media queries here..."
      outputLabel="Formatted CSS"
      outputValue={output}
      outputPlaceholder="Formatted CSS will appear here..."
      onExecute={handleFormat}
      executeLabel="Format CSS"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename="formatted.css"
      downloadMimeType="text/css"
    />
  );
}
