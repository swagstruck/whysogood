'use client';

import React, { useState, useMemo } from 'react';
import { generateUuids } from '@/lib/developer/utilities';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import {
  Copy,
  Download,
  RotateCw,
  Check,
  Hash,
} from 'lucide-react';
import type { UuidVersion } from '@/lib/developer/types';

export default function UuidGeneratorTool() {
  const [count, setCount] = useState<number>(5);
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [noHyphens, setNoHyphens] = useState<boolean>(false);
  const [seed, setSeed] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const toast = useToast();

  const generatedIds = useMemo(() => {
    // seed triggers regeneration
    return generateUuids(count, version, uppercase, noHyphens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, version, uppercase, noHyphens, seed]);

  const outputText = useMemo(() => {
    return generatedIds.join('\n');
  }, [generatedIds]);

  const handleRegenerate = () => {
    setSeed((s) => s + 1);
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await copyToClipboard(outputText);
      setCopied(true);
      toast.success(`Copied ${generatedIds.length} ID${generatedIds.length > 1 ? 's' : ''}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    downloadBlob(new Blob([outputText], { type: 'text/plain' }), 'generated-uuids.txt');
    toast.success('Downloaded generated-uuids.txt');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Configuration Toolbar */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Version Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #A1A1AA)' }}>Algorithm / Format</span>
            <div style={{ width: 140 }}>
              <Select
                value={version}
                onChange={(e) => setVersion(e.target.value as UuidVersion)}
                options={[
                  { label: 'UUID v4 (Random)', value: 'v4' },
                  { label: 'UUID v1 (Time)', value: 'v1' },
                  { label: 'NanoID (URL-safe)', value: 'nanoid' },
                ]}
              />
            </div>
          </div>

          {/* Count Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #A1A1AA)' }}>Quantity: {count}</span>
            <input
              type="range"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ width: 140 }}
            />
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
              />
              <span>Uppercase</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2, #A1A1AA)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={noHyphens}
                onChange={(e) => setNoHyphens(e.target.checked)}
              />
              <span>No Hyphens</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleRegenerate}>
            <RotateCw size={14} style={{ marginRight: 6 }} />
            Regenerate
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
            Copy All
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} style={{ marginRight: 6 }} />
            Download
          </Button>
        </div>
      </div>

      {/* Output Display */}
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
            Generated Identifiers ({generatedIds.length})
          </span>
        </div>

        <textarea
          readOnly
          value={outputText}
          rows={Math.min(Math.max(count, 5), 18)}
          style={{
            width: '100%',
            background: 'var(--bg, #09090B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 8,
            padding: 14,
            color: 'var(--brand, #6060E8)',
            fontSize: 14,
            fontFamily: 'var(--font-mono, monospace)',
            lineHeight: 1.8,
            outline: 'none',
            resize: 'vertical',
          }}
        />
      </div>
    </div>
  );
}
