'use client';

import React, { useState, useEffect } from 'react';
import { generateHashes } from '@/lib/developer/utilities';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import {
  Copy,
  Download,
  Trash2,
  Sparkles,
  Check,
  Shield,
  Key,
} from 'lucide-react';
import type { HashResult } from '@/lib/developer/types';

export default function HashGeneratorTool() {
  const [text, setText] = useState<string>('whysogood - zero-server-upload privacy suite');
  const [hmacKey, setHmacKey] = useState<string>('');
  const [isHmac, setIsHmac] = useState<boolean>(false);
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [hashes, setHashes] = useState<HashResult>({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: '',
  });
  const [copiedAlgo, setCopiedAlgo] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    let isCancelled = false;
    generateHashes(text, isHmac && hmacKey ? hmacKey : undefined).then((res) => {
      if (!isCancelled) {
        setHashes(res);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [text, hmacKey, isHmac]);

  const formatHash = (h: string) => {
    return uppercase ? h.toUpperCase() : h.toLowerCase();
  };

  const handleCopy = async (hashVal: string, algo: string) => {
    try {
      await copyToClipboard(formatHash(hashVal));
      setCopiedAlgo(algo);
      toast.success(`${algo} copied to clipboard`);
      setTimeout(() => setCopiedAlgo(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownloadAll = () => {
    const lines = [
      `Text Input Length: ${text.length} characters`,
      isHmac ? `HMAC Secret Key: [Provided]` : `Mode: Standard Cryptographic Hash`,
      '----------------------------------------',
      `MD5:    ${formatHash(hashes.md5)}`,
      `SHA-1:  ${formatHash(hashes.sha1)}`,
      `SHA-256:${formatHash(hashes.sha256)}`,
      `SHA-512:${formatHash(hashes.sha512)}`,
    ].join('\n');

    downloadBlob(new Blob([lines], { type: 'text/plain' }), 'hashes.txt');
    toast.success('Downloaded hashes.txt');
  };

  const handleClear = () => {
    setText('');
    setHmacKey('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Input Text Card */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
            Input Text Payload
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 size={14} style={{ marginRight: 6 }} />
              Clear
            </Button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to calculate cryptographic checksums and hashes..."
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
          }}
        />

        {/* Options */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isHmac}
                onChange={(e) => setIsHmac(e.target.checked)}
              />
              <span>Enable HMAC Key</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
              />
              <span>Uppercase Hex</span>
            </label>
          </div>

          <Button variant="secondary" size="sm" onClick={handleDownloadAll}>
            <Download size={14} style={{ marginRight: 6 }} />
            Download All Hashes
          </Button>
        </div>

        {/* HMAC Key Input */}
        {isHmac && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="var(--brand, #6060E8)" />
            <input
              type="text"
              value={hmacKey}
              onChange={(e) => setHmacKey(e.target.value)}
              placeholder="Enter secret HMAC key..."
              style={{
                flex: 1,
                background: 'var(--bg, #09090B)',
                border: '1px solid var(--border, #27272A)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--ink, #FFFFFF)',
                fontSize: 13,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            />
          </div>
        )}
      </div>

      {/* Generated Hashes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { name: 'MD5', value: hashes.md5, length: '128-bit / 32 hex' },
          { name: 'SHA-1', value: hashes.sha1, length: '160-bit / 40 hex' },
          { name: 'SHA-256', value: hashes.sha256, length: '256-bit / 64 hex' },
          { name: 'SHA-512', value: hashes.sha512, length: '512-bit / 128 hex' },
        ].map((item) => (
          <div
            key={item.name}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color="var(--brand, #6060E8)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink, #FFFFFF)' }}>
                  {item.name} {isHmac ? 'HMAC' : ''}
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink-2, #71717A)' }}>
                  ({item.length})
                </span>
              </div>

              <Button variant="ghost" size="sm" onClick={() => handleCopy(item.value, item.name)}>
                {copiedAlgo === item.name ? <Check size={14} style={{ marginRight: 4 }} /> : <Copy size={14} style={{ marginRight: 4 }} />}
                Copy
              </Button>
            </div>

            <div
              style={{
                background: 'var(--bg, #09090B)',
                border: '1px solid var(--border, #27272A)',
                borderRadius: 6,
                padding: '10px 12px',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 13,
                color: 'var(--brand, #6060E8)',
                wordBreak: 'break-all',
              }}
            >
              {formatHash(item.value) || '// calculating...'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
