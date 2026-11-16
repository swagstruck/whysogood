'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Trash2, Check, Sparkles, Link, Table, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';

export default function UrlDecoderTool() {
  const [input, setInput] = useState<string>(
    'https%3A%2F%2Fwhysogood.space%2Fsearch%3Fquery%3Dfast%20online%20tools%26category%3Dsecurity%20%26%20tools%23top'
  );
  const [replacePlusWithSpace, setReplacePlusWithSpace] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const toast = useToast();

  // Decode result and URL breakdown
  const decodedData = useMemo(() => {
    const raw = input.trim();
    if (!raw) return null;

    let processed = raw;
    if (replacePlusWithSpace) {
      processed = processed.replace(/\+/g, '%20');
    }

    let decoded = '';
    try {
      decoded = decodeURIComponent(processed);
    } catch {
      try {
        decoded = decodeURI(processed);
      } catch {
        return {
          success: false,
          decoded: '',
          error: 'Malformed URL: contains incomplete or invalid percent-encoded sequences (%ZZ).',
          parsed: null,
          params: [],
        };
      }
    }

    // Try parsing as standard URL or query string
    let parsed: {
      protocol: string;
      host: string;
      pathname: string;
      hash: string;
    } | null = null;
    const paramsList: { key: string; value: string }[] = [];

    try {
      // Check if valid full URL
      const urlObj = new URL(decoded.startsWith('http') ? decoded : `https://${decoded}`);
      if (decoded.startsWith('http') || decoded.startsWith('//')) {
        parsed = {
          protocol: urlObj.protocol,
          host: urlObj.host,
          pathname: urlObj.pathname,
          hash: urlObj.hash,
        };
      }

      // Extract query parameters
      urlObj.searchParams.forEach((val, key) => {
        paramsList.push({ key, value: val });
      });
    } catch {
      // If not a full URL, check if query string like 'a=1&b=2'
      if (decoded.includes('=') || decoded.startsWith('?')) {
        try {
          const qs = decoded.startsWith('?') ? decoded.slice(1) : decoded;
          const searchParams = new URLSearchParams(qs);
          searchParams.forEach((val, key) => {
            paramsList.push({ key, value: val });
          });
        } catch {
          // ignore query parse failure
        }
      }
    }

    return {
      success: true,
      decoded,
      error: null,
      parsed,
      params: paramsList,
    };
  }, [input, replacePlusWithSpace]);

  const handleCopyDecoded = async () => {
    if (!decodedData || !decodedData.success) return;
    await copyToClipboard(decodedData.decoded);
    setCopiedText(true);
    toast.success('Decoded URL copied to clipboard');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyParamsJson = async () => {
    if (!decodedData || decodedData.params.length === 0) return;
    const obj: Record<string, string> = {};
    decodedData.params.forEach((p) => {
      obj[p.key] = p.value;
    });
    await copyToClipboard(JSON.stringify(obj, null, 2));
    setCopiedJson(true);
    toast.success('Parameters copied as JSON');
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleLoadSample = () => {
    setInput(
      'https%3A%2F%2Fapi.example.com%2Fv1%2Fusers%3Ffilter%3Dactive%26sort%3Ddesc%26search%3Dsecurity%2Baudit%26callback%3Dhttps%253A%252F%252Fclient.app'
    );
  };

  const handleClear = () => {
    setInput('');
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
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={replacePlusWithSpace}
            onChange={(e) => setReplacePlusWithSpace(e.target.checked)}
          />
          <span>Treat &apos;+&apos; as space (application/x-www-form-urlencoded)</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={handleLoadSample}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Sample URL
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!input}>
            <Trash2 size={14} style={{ marginRight: 6 }} />
            Clear
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {decodedData && !decodedData.success && decodedData.error && (
        <div className="c-alert c-alert--neg" style={{ fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div>{decodedData.error}</div>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Left Column: Encoded Input */}
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
              Percent-Encoded String
            </label>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {input.length} characters
            </span>
          </div>

          <textarea
            className="c-textarea"
            rows={12}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste percent-encoded URL here (e.g. https%3A%2F%2F...)..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Right Column: Decoded Output */}
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
              Decoded URL / Plaintext
            </label>
            {decodedData?.success && (
              <span className="c-badge c-badge--brand">
                {decodedData.decoded.length} characters
              </span>
            )}
          </div>

          <textarea
            readOnly
            className="c-textarea"
            rows={12}
            value={decodedData?.success ? decodedData.decoded : ''}
            placeholder="Decoded plaintext will appear here..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              background: 'var(--bg-3)',
              color: 'var(--ink)',
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
              onClick={handleCopyDecoded}
              disabled={!decodedData?.success}
            >
              {copiedText ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
              {copiedText ? 'Copied' : 'Copy Decoded URL'}
            </Button>
          </div>
        </div>
      </div>

      {/* Structured Query Parameters & URL Breakdown (if detected) */}
      {decodedData?.success && (decodedData.parsed || decodedData.params.length > 0) && (
        <div className="c-card" style={{ padding: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Table size={16} color="var(--brand-500)" />
              <span>Parsed Query Parameters & Components</span>
            </h3>

            {decodedData.params.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handleCopyParamsJson}>
                {copiedJson ? <Check size={13} style={{ marginRight: 4 }} /> : <Copy size={13} style={{ marginRight: 4 }} />}
                Copy Parameters (JSON)
              </Button>
            )}
          </div>

          {/* URL Structure pills */}
          {decodedData.parsed && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 16,
                padding: 12,
                background: 'var(--bg-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
              }}
            >
              <span><strong>Protocol:</strong> {decodedData.parsed.protocol}</span>
              <span style={{ color: 'var(--ink-3)' }}>•</span>
              <span><strong>Host:</strong> {decodedData.parsed.host}</span>
              <span style={{ color: 'var(--ink-3)' }}>•</span>
              <span><strong>Path:</strong> {decodedData.parsed.pathname}</span>
              {decodedData.parsed.hash && (
                <>
                  <span style={{ color: 'var(--ink-3)' }}>•</span>
                  <span><strong>Hash:</strong> {decodedData.parsed.hash}</span>
                </>
              )}
            </div>
          )}

          {/* Parameters table */}
          {decodedData.params.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)' }}>Key</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)' }}>Decoded Value</th>
                    <th style={{ padding: '8px 12px', width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {decodedData.params.map((p, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td
                        style={{
                          padding: '10px 12px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: 'var(--brand)',
                        }}
                      >
                        {p.key}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--ink)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {p.value}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button
                          onClick={async () => {
                            await copyToClipboard(p.value);
                            toast.success(`Copied ${p.key}`);
                          }}
                          className="c-btn c-btn--ghost c-btn--sm"
                          title="Copy value"
                          style={{ padding: '2px 6px' }}
                        >
                          <Copy size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: 12 }}>
              No query parameters found in the decoded URL.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
