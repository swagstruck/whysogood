'use client';

import React, { useState, useMemo } from 'react';
import { testRegex } from '@/lib/developer/utilities';
import { SAMPLE_REGEX_PATTERN, SAMPLE_REGEX_FLAGS, SAMPLE_REGEX_TEXT, SAMPLE_REGEX_REPLACEMENT } from '@/lib/developer/samples';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import {
  Copy,
  Download,
  Trash2,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  Hash,
  ArrowRightLeft,
} from 'lucide-react';

export default function RegexTesterTool() {
  const [pattern, setPattern] = useState(SAMPLE_REGEX_PATTERN);
  const [flags, setFlags] = useState(SAMPLE_REGEX_FLAGS);
  const [text, setText] = useState(SAMPLE_REGEX_TEXT);
  const [replacePattern, setReplacePattern] = useState(SAMPLE_REGEX_REPLACEMENT);
  const [enableReplace, setEnableReplace] = useState(false);
  const [copied, setCopied] = useState(false);

  const toast = useToast();

  const toggleFlag = (flag: string) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ''));
    } else {
      setFlags(flags + flag);
    }
  };

  const result = useMemo(() => {
    return testRegex(pattern, flags, text, enableReplace ? replacePattern : undefined);
  }, [pattern, flags, text, enableReplace, replacePattern]);

  const handleCopyMatches = async () => {
    if (!result.matches.length) return;
    try {
      const matchText = result.matches.map((m, i) => `#${i + 1} [idx:${m.index}]: ${m.match}`).join('\n');
      await copyToClipboard(matchText);
      setCopied(true);
      toast.success('Matches copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyReplaced = async () => {
    if (!result.replacement) return;
    try {
      await copyToClipboard(result.replacement);
      toast.success('Replaced text copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    const payload = enableReplace
      ? (result.replacement || '')
      : JSON.stringify(result.matches, null, 2);
    const filename = enableReplace ? 'replaced-regex-output.txt' : 'regex-matches.json';
    downloadBlob(new Blob([payload], { type: 'text/plain' }), filename);
    toast.success(`Downloaded ${filename}`);
  };

  const handleLoadSample = () => {
    setPattern(SAMPLE_REGEX_PATTERN);
    setFlags(SAMPLE_REGEX_FLAGS);
    setText(SAMPLE_REGEX_TEXT);
    setReplacePattern(SAMPLE_REGEX_REPLACEMENT);
    setEnableReplace(true);
    toast.success('Loaded regex sample');
  };

  const handleClear = () => {
    setPattern('');
    setText('');
    setReplacePattern('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Pattern Bar */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
            Regular Expression Pattern
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {['g', 'i', 'm', 's', 'u'].map((f) => {
              const active = flags.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlag(f)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono, monospace)',
                    border: '1px solid',
                    borderColor: active ? 'var(--brand, #6060E8)' : 'var(--border, #27272A)',
                    background: active ? 'var(--brand, #6060E8)' : 'var(--bg, #09090B)',
                    color: active ? '#FFFFFF' : 'var(--ink-2, #A1A1AA)',
                    cursor: 'pointer',
                  }}
                  title={`Flag ${f}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, color: 'var(--ink-2, #A1A1AA)', fontFamily: 'var(--font-mono, monospace)' }}>/</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern (e.g. \b[a-z0-9]+)"
            style={{
              flex: 1,
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--ink, #FFFFFF)',
              fontSize: 14,
              fontFamily: 'var(--font-mono, monospace)',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: 18, color: 'var(--ink-2, #A1A1AA)', fontFamily: 'var(--font-mono, monospace)' }}>/{flags}</span>
        </div>

        {/* Replacement Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enableReplace}
              onChange={(e) => setEnableReplace(e.target.checked)}
            />
            <span>Substitution / Replace Mode</span>
          </label>
        </div>

        {enableReplace && (
          <input
            type="text"
            value={replacePattern}
            onChange={(e) => setReplacePattern(e.target.value)}
            placeholder="Replacement string (e.g. $1, [REDACTED])"
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 8,
              padding: '8px 12px',
              color: 'var(--ink, #FFFFFF)',
              fontSize: 13,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
        )}
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleLoadSample}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Load Sample
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 size={14} style={{ marginRight: 6 }} />
            Clear
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={enableReplace ? handleCopyReplaced : handleCopyMatches}>
            {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
            {enableReplace ? 'Copy Output' : 'Copy Matches'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} style={{ marginRight: 6 }} />
            Download
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {!result.isValid && result.error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#F87171',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>{result.error}</span>
        </div>
      )}

      {/* Split Views: Input Text & Matches/Output */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {/* Test Text Pane */}
        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>Test String</span>
            <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)' }}>{text.length} chars</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter or paste text to test against the regular expression..."
            rows={12}
            style={{
              width: '100%',
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 8,
              padding: 12,
              color: 'var(--ink, #FFFFFF)',
              fontSize: 13,
              fontFamily: 'var(--font-mono, monospace)',
              resize: 'vertical',
              lineHeight: 1.5,
              outline: 'none',
            }}
          />
        </div>

        {/* Results Pane */}
        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
              {enableReplace ? 'Replaced Output' : `Matches (${result.matches.length})`}
            </span>
            {result.executionTimeMs !== undefined && (
              <span style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)' }}>
                {result.executionTimeMs}ms
              </span>
            )}
          </div>

          {enableReplace ? (
            <textarea
              readOnly
              value={result.replacement || ''}
              rows={12}
              style={{
                width: '100%',
                background: 'var(--bg, #09090B)',
                border: '1px solid var(--border, #27272A)',
                borderRadius: 8,
                padding: 12,
                color: 'var(--ink, #FFFFFF)',
                fontSize: 13,
                fontFamily: 'var(--font-mono, monospace)',
                resize: 'vertical',
                lineHeight: 1.5,
                outline: 'none',
              }}
            />
          ) : (
            <div
              style={{
                background: 'var(--bg, #09090B)',
                border: '1px solid var(--border, #27272A)',
                borderRadius: 8,
                padding: 12,
                height: 280,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {result.matches.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-2, #A1A1AA)', fontSize: 13 }}>
                  No matches found for current pattern.
                </div>
              ) : (
                result.matches.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-2, #18181B)',
                      border: '1px solid var(--border, #27272A)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono, monospace)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--brand, #6060E8)', fontWeight: 600 }}>
                      <span>Match #{idx + 1}</span>
                      <span style={{ color: 'var(--ink-2, #A1A1AA)', fontWeight: 400 }}>index: {m.index}</span>
                    </div>
                    <div style={{ color: 'var(--ink, #FFFFFF)', background: 'rgba(96, 96, 232, 0.1)', padding: '4px 6px', borderRadius: 4, wordBreak: 'break-all' }}>
                      {m.match}
                    </div>
                    {m.captures && m.captures.length > 0 && (
                      <div style={{ color: 'var(--ink-2, #A1A1AA)', fontSize: 11, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {m.captures.map((c, cIdx) => (
                          <span key={cIdx}>Group {cIdx + 1}: &quot;{c}&quot;</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
