'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Trash2, Check, Sparkles, Link, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';

type EncodeMode = 'component' | 'full' | 'form';

interface QueryParam {
  key: string;
  value: string;
}

export default function UrlEncoderTool() {
  const [mode, setMode] = useState<EncodeMode>('component');
  const [input, setInput] = useState<string>('https://whysogood.space/search?query=fast online tools&category=security & tools#top');
  const [params, setParams] = useState<QueryParam[]>([
    { key: 'query', value: 'free tools' },
    { key: 'filter', value: 'security & privacy' },
  ]);
  const [activeTab, setActiveTab] = useState<'text' | 'builder'>('text');
  const [copied, setCopied] = useState<boolean>(false);
  const toast = useToast();

  // Encode input text based on active mode
  const encodedText = useMemo(() => {
    if (activeTab === 'builder') {
      const parts = params
        .filter((p) => p.key.trim().length > 0)
        .map((p) => {
          const encK = encodeURIComponent(p.key.trim());
          const encV = mode === 'form'
            ? encodeURIComponent(p.value).replace(/%20/g, '+')
            : encodeURIComponent(p.value);
          return `${encK}=${encV}`;
        });
      return parts.length > 0 ? `?${parts.join('&')}` : '';
    }

    if (!input) return '';

    try {
      if (mode === 'full') {
        return encodeURI(input);
      } else if (mode === 'form') {
        return encodeURIComponent(input).replace(/%20/g, '+');
      } else {
        return encodeURIComponent(input);
      }
    } catch {
      return '';
    }
  }, [input, mode, activeTab, params]);

  const handleCopy = async () => {
    if (!encodedText) return;
    await copyToClipboard(encodedText);
    setCopied(true);
    toast.success('Encoded URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddParam = () => {
    setParams((curr) => [...curr, { key: '', value: '' }]);
  };

  const handleUpdateParam = (index: number, field: 'key' | 'value', val: string) => {
    setParams((curr) => {
      const copy = [...curr];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveParam = (index: number) => {
    setParams((curr) => curr.filter((_, i) => i !== index));
  };

  const handleLoadSample = () => {
    setInput('https://whysogood.space/search?q=developer tools & security=100% private');
    setActiveTab('text');
  };

  const handleClear = () => {
    setInput('');
    setParams([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {/* Encoding standard mode buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'component' as const, label: 'Component (encodeURIComponent)', desc: 'Encodes :, /, ?, &, = (Best for query values)' },
            { id: 'full' as const, label: 'Full URI (encodeURI)', desc: 'Preserves URL protocol, host, and path structure' },
            { id: 'form' as const, label: 'Form URL-Encoded (+ for spaces)', desc: 'Replaces spaces with +' },
          ].map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`c-btn ${active ? 'c-btn--primary' : 'c-btn--ghost'} c-btn--sm`}
                title={m.desc}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={handleLoadSample}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Sample URL
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!input && params.length === 0}>
            <Trash2 size={14} style={{ marginRight: 6 }} />
            Clear
          </Button>
        </div>
      </div>

      {/* Tabs: Raw String vs Parameter Builder */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        <button
          onClick={() => setActiveTab('text')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'text' ? 'var(--brand)' : 'transparent',
            color: activeTab === 'text' ? '#ffffff' : 'var(--ink-2)',
            border: 'none',
            fontSize: 13,
            fontWeight: activeTab === 'text' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          Free-form URL / Text
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'builder' ? 'var(--brand)' : 'transparent',
            color: activeTab === 'builder' ? '#ffffff' : 'var(--ink-2)',
            border: 'none',
            fontSize: 13,
            fontWeight: activeTab === 'builder' ? 600 : 500,
            cursor: 'pointer',
          }}
        >
          Query Parameter Builder
        </button>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Left Column: Input Card */}
        <div className="c-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <label className="c-field__label" style={{ margin: 0, fontWeight: 700 }}>
              {activeTab === 'text' ? 'Raw URL or Query to Encode' : 'Query Parameter Pairs'}
            </label>
            {activeTab === 'text' && (
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {input.length} characters
              </span>
            )}
          </div>

          {activeTab === 'text' ? (
            <textarea
              className="c-textarea"
              rows={12}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste or type URL string here to percent-encode..."
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {params.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="c-field__input"
                      placeholder="key (e.g. search)"
                      value={p.key}
                      onChange={(e) => handleUpdateParam(idx, 'key', e.target.value)}
                      style={{ flex: 1, height: 36, fontSize: 13 }}
                    />
                    <span style={{ color: 'var(--ink-3)' }}>=</span>
                    <input
                      type="text"
                      className="c-field__input"
                      placeholder="value (e.g. free tools)"
                      value={p.value}
                      onChange={(e) => handleUpdateParam(idx, 'value', e.target.value)}
                      style={{ flex: 1, height: 36, fontSize: 13 }}
                    />
                    <button
                      onClick={() => handleRemoveParam(idx)}
                      className="c-btn c-btn--ghost c-btn--sm"
                      style={{ padding: '4px 6px' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="secondary" size="sm" onClick={handleAddParam} style={{ alignSelf: 'flex-start' }}>
                <Plus size={14} style={{ marginRight: 6 }} />
                Add Parameter
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Encoded Output Card */}
        <div className="c-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <label className="c-field__label" style={{ margin: 0, fontWeight: 700 }}>
              Percent-Encoded Result
            </label>
            {encodedText && (
              <span className="c-badge c-badge--brand">
                {encodedText.length} characters
              </span>
            )}
          </div>

          <textarea
            readOnly
            className="c-textarea"
            rows={12}
            value={encodedText}
            placeholder="Percent-encoded string will appear here..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              background: 'var(--bg-3)',
              color: 'var(--brand)',
              resize: 'vertical',
            }}
          />

          {/* Action button: Exactly 1 primary button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 16,
            }}
          >
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              disabled={!encodedText}
            >
              {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
              {copied ? 'Copied' : 'Copy Encoded URL'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
