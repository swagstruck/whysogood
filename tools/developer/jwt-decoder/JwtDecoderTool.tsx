'use client';

import React, { useState, useMemo } from 'react';
import { decodeJwt } from '@/lib/developer/utilities';
import { SAMPLE_JWT } from '@/lib/developer/samples';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import {
  Copy,
  Download,
  Trash2,
  Sparkles,
  Check,
  AlertCircle,
  Key,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';

export default function JwtDecoderTool() {
  const [token, setToken] = useState(SAMPLE_JWT);
  const toast = useToast();

  const result = useMemo(() => {
    return decodeJwt(token);
  }, [token]);

  const handleCopySection = async (data: any, label: string) => {
    if (!data) return;
    try {
      await copyToClipboard(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    const payload = JSON.stringify(
      {
        header: result.header,
        payload: result.payload,
        signature: result.signature,
        isExpired: result.isExpired,
        issuedAt: result.issuedAt,
        expiresAt: result.expiresAt,
      },
      null,
      2
    );
    downloadBlob(new Blob([payload], { type: 'application/json' }), 'jwt-decoded.json');
    toast.success('Downloaded jwt-decoded.json');
  };

  const handleLoadSample = () => {
    setToken(SAMPLE_JWT);
    toast.success('Loaded sample JWT');
  };

  const handleClear = () => {
    setToken('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Input Token Box */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
            Encoded JWT Token
          </span>
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
        </div>

        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste JSON Web Token here (header.payload.signature)..."
          rows={4}
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

      {/* Error Banner */}
      {result.error && (
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

      {/* Status Badges */}
      {!result.error && result.payload && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: result.isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: result.isExpired ? '#EF4444' : '#22C55E',
              border: `1px solid ${result.isExpired ? '#EF444440' : '#22C55E40'}`,
            }}
          >
            {result.isExpired ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
            <span>{result.isExpired ? 'Token Expired' : 'Token Active / Valid'}</span>
          </div>

          {result.expiresAt && (
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--bg-2, #18181B)',
                color: 'var(--ink-2, #A1A1AA)',
                border: '1px solid var(--border, #27272A)',
              }}
            >
              <Clock size={15} />
              <span>Expires: {new Date(result.expiresAt).toLocaleString()}</span>
            </div>
          )}

          {result.issuedAt && (
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--bg-2, #18181B)',
                color: 'var(--ink-2, #A1A1AA)',
                border: '1px solid var(--border, #27272A)',
              }}
            >
              <span>Issued: {new Date(result.issuedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Decoded Sections Split */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {/* Header Section */}
        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F43F5E' }}>HEADER: ALGORITHM & TOKEN TYPE</span>
            <Button variant="ghost" size="sm" onClick={() => handleCopySection(result.header, 'Header')}>
              <Copy size={13} style={{ marginRight: 4 }} />
              Copy
            </Button>
          </div>
          <pre
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 8,
              padding: 12,
              color: '#FDA4AF',
              fontSize: 13,
              fontFamily: 'var(--font-mono, monospace)',
              overflowX: 'auto',
              minHeight: 120,
            }}
          >
            {result.header ? JSON.stringify(result.header, null, 2) : '// Empty or invalid header'}
          </pre>
        </div>

        {/* Payload Section */}
        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#A855F7' }}>PAYLOAD: DATA / CLAIMS</span>
            <Button variant="ghost" size="sm" onClick={() => handleCopySection(result.payload, 'Payload')}>
              <Copy size={13} style={{ marginRight: 4 }} />
              Copy
            </Button>
          </div>
          <pre
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 8,
              padding: 12,
              color: '#D8B4FE',
              fontSize: 13,
              fontFamily: 'var(--font-mono, monospace)',
              overflowX: 'auto',
              minHeight: 120,
            }}
          >
            {result.payload ? JSON.stringify(result.payload, null, 2) : '// Empty or invalid payload'}
          </pre>
        </div>
      </div>

      {/* Signature Section */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#06B6D4' }}>VERIFY SIGNATURE</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => handleCopySection(result.signature, 'Signature')}>
              <Copy size={13} style={{ marginRight: 4 }} />
              Copy
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={13} style={{ marginRight: 4 }} />
              Download Decoded
            </Button>
          </div>
        </div>
        <div
          style={{
            background: 'var(--bg, #09090B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 8,
            padding: 12,
            color: '#67E8F9',
            fontSize: 13,
            fontFamily: 'var(--font-mono, monospace)',
            wordBreak: 'break-all',
          }}
        >
          {result.signature || '// No signature present'}
        </div>
      </div>
    </div>
  );
}
