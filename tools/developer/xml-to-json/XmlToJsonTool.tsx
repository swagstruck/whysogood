'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { xmlToJson } from '@/lib/developer/converters';
import { SAMPLE_XML } from '@/lib/developer/samples';
import { Select } from '@/components/ui/Select';

export default function XmlToJsonTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentOption, setIndentOption] = useState<string>('2');
  const [parsePrimitives, setParsePrimitives] = useState(true);
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleConvert = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const indent = indentOption === 'tab' ? 2 : parseInt(indentOption, 10);
    const result = xmlToJson(input, indent, {
      parseNumbersAndBooleans: parsePrimitives,
    });

    if (result.error) {
      setError({ message: result.error });
      setOutput('');
    } else {
      setOutput(result.output);
      setError(null);
    }
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_XML);
    const indent = indentOption === 'tab' ? 2 : parseInt(indentOption, 10);
    const result = xmlToJson(SAMPLE_XML, indent, {
      parseNumbersAndBooleans: parsePrimitives,
    });
    setOutput(result.output);
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={parsePrimitives}
            onChange={(e) => setParsePrimitives(e.target.checked)}
          />
          Parse Primitives
        </label>
      </div>
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input XML"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write XML markup here..."
      outputLabel="JSON Output"
      outputValue={output}
      outputPlaceholder="Parsed JSON object tree will appear here..."
      onExecute={handleConvert}
      executeLabel="Convert to JSON"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename="converted.json"
      downloadMimeType="application/json"
    />
  );
}
