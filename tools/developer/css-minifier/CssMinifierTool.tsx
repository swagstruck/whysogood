'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { minifyCss } from '@/lib/developer/minifiers';
import { SAMPLE_CSS } from '@/lib/developer/samples';
import { Sparkles } from 'lucide-react';

export default function CssMinifierTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
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

    const result = minifyCss(input);
    setOutput(result.minified);
    setMetrics({
      originalSize: result.originalSize,
      minifiedSize: result.minifiedSize,
      bytesSaved: result.bytesSaved,
      reductionPercentage: result.reductionPercentage,
    });
    setError(result.error || null);
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_CSS);
    const result = minifyCss(SAMPLE_CSS);
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

  return (
    <DeveloperSplitPane
      inputLabel="Input CSS"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write CSS rules here to compress..."
      outputLabel="Minified CSS"
      outputValue={output}
      outputPlaceholder="Minified CSS will appear here with savings metrics..."
      onExecute={handleMinify}
      executeLabel="Minify CSS"
      executeIcon={<Sparkles size={15} />}
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      metrics={metrics}
      error={error}
      downloadFilename="minified.css"
      downloadMimeType="text/css"
    />
  );
}
