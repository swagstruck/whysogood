'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { jsonToCsv, csvToJson } from '@/lib/developer/converters';
import { SAMPLE_JSON_FOR_CSV, SAMPLE_CSV } from '@/lib/developer/samples';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ArrowRightLeft } from 'lucide-react';

export default function JsonToCsvTool() {
  const [direction, setDirection] = useState<'json-to-csv' | 'csv-to-json'>('json-to-csv');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [delimiter, setDelimiter] = useState<string>(',');
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  const [flattenNested, setFlattenNested] = useState<boolean>(true);
  const [quoteStyle, setQuoteStyle] = useState<'as-needed' | 'always' | 'none'>('as-needed');
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const isJsonToCsv = direction === 'json-to-csv';

  const handleConvert = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    if (isJsonToCsv) {
      const result = jsonToCsv(input, {
        delimiter,
        includeHeaders,
        flattenNested,
        quoteStyle,
      });

      if (result.error) {
        setError({ message: result.error });
        setOutput('');
      } else {
        setOutput(result.output);
        setError(null);
      }
    } else {
      const result = csvToJson(input, {
        delimiter,
        hasHeaders: includeHeaders,
        unflattenNested: flattenNested,
      });

      if (result.error) {
        setError({ message: result.error });
        setOutput('');
      } else {
        setOutput(result.output);
        setError(null);
      }
    }
  };

  const handleLoadSample = () => {
    if (isJsonToCsv) {
      setInput(SAMPLE_JSON_FOR_CSV);
      const res = jsonToCsv(SAMPLE_JSON_FOR_CSV, {
        delimiter,
        includeHeaders,
        flattenNested,
        quoteStyle,
      });
      setOutput(res.output);
    } else {
      setInput(SAMPLE_CSV);
      const res = csvToJson(SAMPLE_CSV, {
        delimiter,
        hasHeaders: includeHeaders,
        unflattenNested: flattenNested,
      });
      setOutput(res.output);
    }
    setError(null);
  };

  const handleSwapDirection = () => {
    const nextDir = isJsonToCsv ? 'csv-to-json' : 'json-to-csv';
    setDirection(nextDir);
    // Swap input and output if available
    if (output) {
      setInput(output);
      setOutput('');
    }
    setError(null);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const optionsToolbar = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSwapDirection}
        icon={<ArrowRightLeft size={14} />}
        title="Swap conversion direction"
        style={{
          color: 'var(--brand, #6060e8)',
          background: 'rgba(96, 96, 232, 0.12)',
        }}
      >
        {isJsonToCsv ? 'JSON → CSV' : 'CSV → JSON'}
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
        <span>Delimiter:</span>
        <Select
          selectSize="sm"
          fullWidth={false}
          value={delimiter}
          onChange={(e) => setDelimiter(e.target.value)}
          options={[
            { value: ',', label: 'Comma (,)' },
            { value: ';', label: 'Semicolon (;)' },
            { value: '\t', label: 'Tab (\\t)' },
            { value: '|', label: 'Pipe (|)' },
          ]}
          style={{ width: 120 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeHeaders}
            onChange={(e) => setIncludeHeaders(e.target.checked)}
          />
          Headers
        </label>
      </div>

      {isJsonToCsv && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={flattenNested}
                onChange={(e) => setFlattenNested(e.target.checked)}
              />
              Flatten
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
            <span>Quotes:</span>
            <Select
              selectSize="sm"
              fullWidth={false}
              value={quoteStyle}
              onChange={(e) => setQuoteStyle(e.target.value as 'as-needed' | 'always' | 'none')}
              options={[
                { value: 'as-needed', label: 'As needed' },
                { value: 'always', label: 'Always' },
                { value: 'none', label: 'Never' },
              ]}
              style={{ width: 110 }}
            />
          </div>
        </>
      )}
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel={isJsonToCsv ? 'Input JSON Array' : 'Input CSV'}
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder={
        isJsonToCsv
          ? 'Paste JSON array of objects here...\n[\n  { "id": 1, "name": "Alice" },\n  { "id": 2, "name": "Bob" }\n]'
          : 'Paste CSV text here...\nid,name\n1,Alice\n2,Bob'
      }
      outputLabel={isJsonToCsv ? 'CSV Output' : 'JSON Output'}
      outputValue={output}
      outputPlaceholder="Converted result will appear here..."
      onExecute={handleConvert}
      executeLabel={isJsonToCsv ? 'Convert to CSV' : 'Convert to JSON'}
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename={isJsonToCsv ? 'converted.csv' : 'converted.json'}
      downloadMimeType={isJsonToCsv ? 'text/csv' : 'application/json'}
    />
  );
}
