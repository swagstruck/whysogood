'use client';

import React, { useState } from 'react';
import { Copy, Check, Trash2, Sparkles, KeyRound, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { decodeJwtSec, JwtDecoded } from '@/lib/security/engines';
import { copyToClipboard } from '@/lib/utils';

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsZXggTW9yZ2FuIiwiZW1haWwiOiJhbGV4QHdoeXNvZ29vZC5zcGFjZSIsImFkbWluIjp0cnVlLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MjA1MTYyMzkwMn0.9xJ_bK7Z1T7_XvFv9OZbY9j7x5-78Y8h0e8d0e7-8b0';

export default function JwtDecoderSecTool() {
  const [token, setToken] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [copiedHeader, setCopiedHeader] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const toast = useToast();

  const decoded: JwtDecoded | null = token.trim() ? decodeJwtSec(token.trim()) : null;
  const parts = token.trim().split('.');
  const hasThreeParts = parts.length === 3;

  const handleClear = () => {
    setToken('');
  };

  const loadSample = () => {
    setToken(SAMPLE_JWT);
    toast.success('Sample JWT loaded');
  };

  const copyHeader = () => {
    if (!decoded) return;
    copyToClipboard(JSON.stringify(decoded.header, null, 2));
    setCopiedHeader(true);
    toast.success('JWT Header copied');
    setTimeout(() => setCopiedHeader(false), 2000);
  };

  const copyPayload = () => {
    if (!decoded) return;
    copyToClipboard(JSON.stringify(decoded.payload, null, 2));
    setCopiedPayload(true);
    toast.success('JWT Payload copied');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const copyFullDecoded = () => {
    if (!decoded) return;
    const full = JSON.stringify(
      {
        header: decoded.header,
        payload: decoded.payload,
        signature: decoded.signature,
        status: {
          isExpired: decoded.isExpired,
          expiresAt: decoded.expiresAt,
          issuedAt: decoded.issuedAt
        }
      },
      null,
      2
    );
    copyToClipboard(full);
    setCopiedAll(true);
    toast.success('Full Decoded JWT copied');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const formatTimestamp = (ts: unknown) => {
    if (typeof ts !== 'number') return null;
    try {
      const d = new Date(ts * 1000);
      return d.toUTCString();
    } catch {
      return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Input Card */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              JSON Web Token (JWT) Inspector
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Decode, inspect, and verify timestamps of Base64URL-encoded JWT tokens completely in your browser.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={loadSample}>
              <Sparkles size={16} /> Sample JWT
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={!token}>
              <Trash2 size={16} /> Clear
            </Button>
          </div>
        </div>

        {/* Input Textarea */}
        <div className="c-field">
          <label className="c-field__label">Encoded JWT Token (Header.Payload.Signature)</label>
          <textarea
            className="c-textarea"
            rows={4}
            placeholder="Paste your JWT token here (e.g. eyJhbGciOi...)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-body-sm)' }}
          />
        </div>

        {/* Color-coded breakdown view */}
        {token.trim() && hasThreeParts && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-caption)',
              wordBreak: 'break-all',
              lineHeight: 1.6
            }}
          >
            <span style={{ color: '#DE3B3D', fontWeight: 600 }}>{parts[0]}</span>
            <span style={{ color: 'var(--ink-3)' }}>.</span>
            <span style={{ color: '#1580D1', fontWeight: 600 }}>{parts[1]}</span>
            <span style={{ color: 'var(--ink-3)' }}>.</span>
            <span style={{ color: '#04AB62', fontWeight: 600 }}>{parts[2]}</span>
          </div>
        )}

        {token.trim() && !decoded && (
          <div className="c-alert c-alert--neg">
            <AlertCircle size={18} />
            <div>
              <strong>Invalid JWT Structure:</strong> A standard JWT must consist of three Base64URL-encoded segments separated by dots.
            </div>
          </div>
        )}
      </div>

      {/* Decoded Inspection Panels */}
      {decoded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status & Expiry Bar */}
          <div
            className="c-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} style={{ color: 'var(--brand)' }} />
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  Algorithm: {String(decoded.header.alg || 'None')}
                </span>
                <span className="c-badge c-badge--brand">
                  {String(decoded.header.typ || 'JWT')}
                </span>
              </div>

              {decoded.payload.exp !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: 'var(--ink-2)' }} />
                  {decoded.isExpired ? (
                    <span className="c-badge c-badge--neg">
                      <span className="c-badge-dot" /> Expired Token
                    </span>
                  ) : (
                    <span className="c-badge c-badge--pos">
                      <span className="c-badge-dot" /> Active / Valid
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Rule 2: Single Primary Button */}
            <button
              type="button"
              className="c-btn c-btn--primary"
              onClick={copyFullDecoded}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {copiedAll ? <Check size={18} /> : <Copy size={18} />}
              Copy Full Decoded JSON
            </button>
          </div>

          {/* Side-by-side or stacked Header & Payload */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Header Panel */}
            <div className="c-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DE3B3D' }} />
                  <h3 style={{ fontSize: 'var(--text-h5)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                    Header: Algorithm & Token Type
                  </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={copyHeader}>
                  {copiedHeader ? <Check size={14} style={{ color: 'var(--pos)' }} /> : <Copy size={14} />} Copy
                </Button>
              </div>

              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: 'var(--bg-3)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-caption)',
                  color: 'var(--ink)',
                  overflowX: 'auto',
                  border: '1px solid var(--border)'
                }}
              >
                {JSON.stringify(decoded.header, null, 2)}
              </pre>
            </div>

            {/* Signature Info */}
            <div className="c-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#04AB62' }} />
                <h3 style={{ fontSize: 'var(--text-h5)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  Signature Verification Status
                </h3>
              </div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-3)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-caption)',
                  color: 'var(--ink-2)',
                  wordBreak: 'break-all',
                  border: '1px solid var(--border)'
                }}
              >
                {decoded.signature || 'Unsigned'}
              </div>
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-3)', margin: 0 }}>
                Client-side decoder inspects claims without transmitting your secret key over network.
              </p>
            </div>
          </div>

          {/* Payload Panel */}
          <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1580D1' }} />
                <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  Payload: Data Claims
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={copyPayload}>
                {copiedPayload ? <Check size={16} style={{ color: 'var(--pos)' }} /> : <Copy size={16} />} Copy JSON
              </Button>
            </div>

            {/* Standard Claims Human-Readable Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {decoded.payload.exp !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-body-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Expiration (exp):</span>
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {formatTimestamp(decoded.payload.exp) || String(decoded.payload.exp)}
                  </span>
                </div>
              )}
              {decoded.payload.iat !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-body-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Issued At (iat):</span>
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {formatTimestamp(decoded.payload.iat) || String(decoded.payload.iat)}
                  </span>
                </div>
              )}
              {decoded.payload.sub !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-body-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Subject (sub):</span>
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {String(decoded.payload.sub)}
                  </span>
                </div>
              )}
              {decoded.payload.iss !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-body-sm)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Issuer (iss):</span>
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {String(decoded.payload.iss)}
                  </span>
                </div>
              )}
            </div>

            <pre
              style={{
                margin: 0,
                padding: '16px',
                backgroundColor: 'var(--bg-3)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-body-sm)',
                color: 'var(--ink)',
                overflowX: 'auto',
                border: '1px solid var(--border)'
              }}
            >
              {JSON.stringify(decoded.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Security Guarantee Notice */}
      <div className="c-alert c-alert--pos">
        <ShieldCheck size={20} />
        <div>
          <strong>100% Client-Side Privacy:</strong> Decoding is executed purely in local memory inside your web browser. Neither your JWT tokens nor secret credentials are ever uploaded or transmitted across any network.
        </div>
      </div>
    </div>
  );
}
