'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SAMPLE_JSON } from '@/lib/developer/samples';
import { getLineAndColumn } from '@/lib/developer/formatters';
import { Sparkles, Minimize2 } from 'lucide-react';

export default function JsonFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentOption, setIndentOption] = useState('2');
  const [sortKeys, setSortKeys] = useState(false);
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const getIndent = () => {
    if (indentOption === 'tab') return '\t';
    return Number(indentOption) || 2;
  };

  const sortObjectKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    }
    if (obj !== null && typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      for (const k of keys) {
        sorted[k] = sortObjectKeys((obj as Record<string, unknown>)[k]);
      }
      return sorted;
    }
    return obj;
  };

  const handleFormat = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    try {
      let parsed = JSON.parse(input);
      if (sortKeys) {
        parsed = sortObjectKeys(parsed);
      }
      const formatted = JSON.stringify(parsed, null, getIndent());
      setOutput(formatted);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        const msg = err.message;
        let line: number | undefined;
        let column: number | undefined;

        const posMatch = msg.match(/position\s+(\d+)/i);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const loc = getLineAndColumn(input, pos);
          line = loc.line;
          column = loc.column;
        } else {
          const lineColMatch = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
          if (lineColMatch) {
            line = parseInt(lineColMatch[1], 10);
            column = parseInt(lineColMatch[2], 10);
          }
        }

        setError({
          message: msg,
          line,
          column,
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Invalid JSON input',
        });
      }
    }
  };

  const handleMinify = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    try {
      let parsed = JSON.parse(input);
      if (sortKeys) {
        parsed = sortObjectKeys(parsed);
      }
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError(null);
    } catch (err: unknown) {
      setError({
        message: err instanceof Error ? err.message : 'Invalid JSON input',
      });
    }
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_JSON);
    try {
      const parsed = JSON.parse(SAMPLE_JSON);
      setOutput(JSON.stringify(parsed, null, getIndent()));
      setError(null);
    } catch {
      setOutput(SAMPLE_JSON);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const optionsToolbar = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)' }}>
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
          style={{ width: 110 }}
        />
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleMinify}
        icon={<Minimize2 size={14} />}
        title="Minify JSON (inline whitespace removal)"
      >
        Minify
      </Button>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--ink-2)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={sortKeys}
          onChange={(e) => setSortKeys(e.target.checked)}
          style={{ cursor: 'pointer', accentColor: 'var(--brand)' }}
        />
        <span>Sort Keys</span>
      </label>
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input JSON"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write JSON here to format, beautify, and validate..."
      outputLabel="Formatted JSON"
      outputValue={output}
      outputPlaceholder="Formatted and indented JSON will appear here..."
      onExecute={handleFormat}
      executeLabel="Format JSON"
      executeIcon={<Sparkles size={15} />}
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      downloadFilename="formatted.json"
      downloadMimeType="application/json"
      error={error}
    />
  );
}
