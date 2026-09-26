'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { minifyJson } from '@/lib/developer/minifiers';
import { SAMPLE_JSON } from '@/lib/developer/samples';
import { Sparkles } from 'lucide-react';

export default function JsonMinifierTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [sortKeys, setSortKeys] = useState(false);
  const [metrics, setMetrics] = useState<{
    originalSize: number;
    minifiedSize: number;
    bytesSaved: number;
    reductionPercentage: number;
  } | null>(null);
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleMinify = () => {
    if (!input.trim()) {
      setOutput('');
      setMetrics(null);
      setError(null);
      return;
    }

    const result = minifyJson(input, { sortKeys });
    setOutput(result.minified);
    if (!result.error) {
      setMetrics({
        originalSize: result.originalSize,
        minifiedSize: result.minifiedSize,
        bytesSaved: result.bytesSaved,
        reductionPercentage: result.reductionPercentage,
      });
      setError(null);
    } else {
      setMetrics(null);
      setError(result.error);
    }
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_JSON);
    const result = minifyJson(SAMPLE_JSON, { sortKeys });
    setOutput(result.minified);
    setMetrics({
      originalSize: result.originalSize,
      minifiedSize: result.minifiedSize,
      bytesSaved: result.bytesSaved,
      reductionPercentage: result.reductionPercentage,
    });
    setError(null);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setMetrics(null);
    setError(null);
  };

  const optionsToolbar = (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        color: 'var(--ink-2, #A1A1A1)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        checked={sortKeys}
        onChange={(e) => setSortKeys(e.target.checked)}
        style={{ cursor: 'pointer', accentColor: 'var(--brand, #6060e8)' }}
      />
      <span>Sort Keys</span>
    </label>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input JSON"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write formatted JSON here to minify..."
      outputLabel="Minified JSON"
      outputValue={output}
      outputPlaceholder="Minified JSON will appear here with savings metrics..."
      onExecute={handleMinify}
      executeLabel="Minify JSON"
      executeIcon={<Sparkles size={15} />}
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      metrics={metrics}
      error={error}
      downloadFilename="minified.json"
      downloadMimeType="application/json"
    />
  );
}
