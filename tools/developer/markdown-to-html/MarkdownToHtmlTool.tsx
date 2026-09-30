'use client';

import React, { useState } from 'react';
import { DeveloperSplitPane } from '../common/DeveloperSplitPane';
import { markdownToHtml } from '@/lib/developer/converters';
import { SAMPLE_MARKDOWN } from '@/lib/developer/samples';
import { Button } from '@/components/ui/Button';
import { Eye, Code } from 'lucide-react';

export default function MarkdownToHtmlTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [includeBoilerplate, setIncludeBoilerplate] = useState(false);
  const [error, setError] = useState<{ message: string; line?: number; column?: number } | null>(null);

  const handleConvert = () => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const result = markdownToHtml(input, {
      includeBoilerplate,
      title: 'Converted Markdown Document',
    });

    if (result.error) {
      setError({ message: result.error });
      setOutput('');
    } else {
      setOutput(result.html);
      setError(null);
    }
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_MARKDOWN);
    const result = markdownToHtml(SAMPLE_MARKDOWN, {
      includeBoilerplate,
      title: 'Converted Markdown Document',
    });
    setOutput(result.html);
    setError(null);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const optionsToolbar = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-2)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px',
          border: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode('preview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: '6px',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            background: viewMode === 'preview' ? 'var(--brand)' : 'transparent',
            color: viewMode === 'preview' ? 'var(--ink-inverse)' : 'var(--ink-2)',
            transition: 'all 0.15s ease',
          }}
          title="View rendered live preview"
        >
          <Eye size={13} />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('code')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: '6px',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            background: viewMode === 'code' ? 'var(--brand)' : 'transparent',
            color: viewMode === 'code' ? 'var(--ink-inverse)' : 'var(--ink-2)',
            transition: 'all 0.15s ease',
          }}
          title="View raw HTML markup"
        >
          <Code size={13} />
          <span>HTML Code</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeBoilerplate}
            onChange={(e) => {
              setIncludeBoilerplate(e.target.checked);
              if (input.trim()) {
                const res = markdownToHtml(input, {
                  includeBoilerplate: e.target.checked,
                  title: 'Converted Markdown Document',
                });
                setOutput(res.html);
              }
            }}
          />
          Full Page (HTML5)
        </label>
      </div>
    </>
  );

  // Styled rendered preview container
  const customPreview = (
    <div
      className="markdown-rendered-preview"
      style={{
        color: 'var(--ink)',
        fontSize: 14,
        lineHeight: 1.7,
        padding: '8px 4px',
        wordBreak: 'break-word',
      }}
    >
      <style>{`
        .markdown-rendered-preview h1 { font-size: 1.8rem; font-weight: 700; margin: 0 0 16px 0; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        .markdown-rendered-preview h2 { font-size: 1.4rem; font-weight: 600; margin: 20px 0 12px 0; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .markdown-rendered-preview h3 { font-size: 1.2rem; font-weight: 600; margin: 16px 0 8px 0; }
        .markdown-rendered-preview h4 { font-size: 1.05rem; font-weight: 600; margin: 12px 0 6px 0; }
        .markdown-rendered-preview p { margin: 0 0 12px 0; }
        .markdown-rendered-preview blockquote { border-left: 4px solid var(--brand); margin: 12px 0; padding: 6px 16px; background: var(--brand-subtle); border-radius: 0 8px 8px 0; color: var(--ink-2); }
        .markdown-rendered-preview table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .markdown-rendered-preview th { background: var(--bg-2); border: 1px solid var(--border); padding: 8px 12px; font-weight: 600; text-align: left; }
        .markdown-rendered-preview td { border: 1px solid var(--border); padding: 8px 12px; }
        .markdown-rendered-preview pre { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; overflow-x: auto; margin: 12px 0; }
        .markdown-rendered-preview pre code { background: transparent; padding: 0; border-radius: 0; font-size: 13px; font-family: var(--font-mono, monospace); color: var(--brand); }
        .markdown-rendered-preview code { background: var(--bg-3); color: var(--ink); padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono, monospace); }
        .markdown-rendered-preview ul, .markdown-rendered-preview ol { margin: 8px 0 12px 24px; padding: 0; }
        .markdown-rendered-preview li { margin-bottom: 4px; }
        .markdown-rendered-preview hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
        .markdown-rendered-preview a { color: var(--brand); text-decoration: underline; text-underline-offset: 3px; }
        .markdown-rendered-preview del { opacity: 0.6; }
      `}</style>
      {output ? (
        <div dangerouslySetInnerHTML={{ __html: output }} />
      ) : (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
          Rendered live HTML preview will appear here...
        </div>
      )}
    </div>
  );

  return (
    <DeveloperSplitPane
      inputLabel="Markdown Source"
      inputValue={input}
      onInputChange={setInput}
      inputPlaceholder="Write or paste GitHub Flavored Markdown here..."
      outputLabel={viewMode === 'preview' ? 'Rendered Preview' : 'Generated HTML'}
      outputValue={output}
      outputPlaceholder="HTML output will appear here..."
      onExecute={handleConvert}
      executeLabel="Convert to HTML"
      onClear={handleClear}
      onLoadSample={handleLoadSample}
      optionsToolbar={optionsToolbar}
      error={error}
      downloadFilename="converted.html"
      downloadMimeType="text/html"
      customOutputRenderer={viewMode === 'preview' ? customPreview : undefined}
    />
  );
}
