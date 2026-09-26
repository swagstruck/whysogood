'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { minifyHtml } from '@/lib/developer/minifiers';
import { SAMPLE_HTML } from '@/lib/developer/samples';
import { Sparkles } from 'lucide-react';

export default function HtmlMinifierTool() {
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

    const result = minifyHtml(input);
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
    setInput(SAMPLE_HTML);
    const result = minifyHtml(SAMPLE_HTML);
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
      inputLabel="Input HTML"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write HTML markup here to compress..."
      outputLabel="Minified HTML"
      outputValue={output}
      outputPlaceholder="Minified HTML will appear here with savings metrics..."
      onExecute={handleMinify}
      executeLabel="Minify HTML"
      executeIcon={<Sparkles size={15} />}
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      metrics={metrics}
      error={error}
      downloadFilename="minified.html"
      downloadMimeType="text/html"
    />
  );
}
