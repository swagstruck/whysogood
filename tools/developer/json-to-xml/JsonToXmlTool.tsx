'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { jsonToXml } from '@/lib/developer/converters';
import { SAMPLE_JSON_FOR_XML } from '@/lib/developer/samples';
import { Select } from '@/components/ui/Select';

export default function JsonToXmlTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [rootTag, setRootTag] = useState('root');
  const [arrayItemTag, setArrayItemTag] = useState('item');
  const [includeDeclaration, setIncludeDeclaration] = useState(true);
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleConvert = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const result = jsonToXml(input, rootTag || 'root', {
      declaration: includeDeclaration,
      arrayItemTag: arrayItemTag || 'item',
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
    setInput(SAMPLE_JSON_FOR_XML);
    const result = jsonToXml(SAMPLE_JSON_FOR_XML, rootTag || 'root', {
      declaration: includeDeclaration,
      arrayItemTag: arrayItemTag || 'item',
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
        <span>Root Tag:</span>
        <input
          type="text"
          value={rootTag}
          onChange={(e) => setRootTag(e.target.value)}
          placeholder="root"
          style={{
            width: 80,
            padding: '4px 8px',
            background: 'var(--bg-2, #1C1C1C)',
            border: '1px solid var(--border, #2A2A2A)',
            borderRadius: '6px',
            color: 'var(--ink, #FAFAFA)',
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
        <span>Item Tag:</span>
        <input
          type="text"
          value={arrayItemTag}
          onChange={(e) => setArrayItemTag(e.target.value)}
          placeholder="item"
          style={{
            width: 80,
            padding: '4px 8px',
            background: 'var(--bg-2, #1C1C1C)',
            border: '1px solid var(--border, #2A2A2A)',
            borderRadius: '6px',
            color: 'var(--ink, #FAFAFA)',
            fontSize: 12,
            fontFamily: 'var(--font-mono, monospace)',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1A1)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeDeclaration}
            onChange={(e) => setIncludeDeclaration(e.target.checked)}
          />
          &lt;?xml?&gt; Header
        </label>
      </div>
    </>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Input JSON"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Paste or write structured JSON payload here..."
      outputLabel="Generated XML"
      outputValue={output}
      outputPlaceholder="Converted XML document will appear here..."
      onExecute={handleConvert}
      executeLabel="Convert to XML"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename="converted.xml"
      downloadMimeType="application/xml"
    />
  );
}
