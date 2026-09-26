'use client';

import React, { useState, useMemo } from 'react';
import { validateJson, autoFixJson } from '@/lib/developer/utilities';
import { SAMPLE_JSON_VALIDATOR_INVALID } from '@/lib/developer/samples';
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
  Wrench,
  CheckCircle2,
} from 'lucide-react';

export default function JsonValidatorTool() {
  const [jsonInput, setJsonInput] = useState<string>(SAMPLE_JSON_VALIDATOR_INVALID);
  const [copied, setCopied] = useState<boolean>(false);

  const toast = useToast();

  const validationResult = useMemo(() => {
    return validateJson(jsonInput);
  }, [jsonInput]);

  const handleFormat = () => {
    if (validationResult.isValid && validationResult.formatted) {
      setJsonInput(validationResult.formatted);
      toast.success('JSON formatted');
    } else {
      toast.error('Cannot format invalid JSON. Fix errors first or click "Fix Automatically".');
    }
  };

  const handleAutoFix = () => {
    const { fixed, appliedFixes } = autoFixJson(jsonInput);
    setJsonInput(fixed);
    if (appliedFixes.length > 0) {
      toast.success(`Applied fixes: ${appliedFixes.join(', ')}`);
    } else {
      toast.info('No common syntax fixes could be applied.');
    }
  };

  const handleCopy = async () => {
    if (!jsonInput) return;
    try {
      await copyToClipboard(jsonInput);
      setCopied(true);
      toast.success('JSON copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    downloadBlob(new Blob([jsonInput], { type: 'application/json' }), 'validated.json');
    toast.success('Downloaded validated.json');
  };

  const handleLoadSample = () => {
    setJsonInput(SAMPLE_JSON_VALIDATOR_INVALID);
    toast.success('Loaded invalid JSON sample');
  };

  const handleClear = () => {
    setJsonInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Toolbar */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
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
          {!validationResult.isValid && (
            <Button variant="secondary" size="sm" onClick={handleAutoFix}>
              <Wrench size={14} style={{ marginRight: 6 }} />
              Fix Automatically
            </Button>
          )}
          {validationResult.isValid && (
            <Button variant="secondary" size="sm" onClick={handleFormat}>
              <Sparkles size={14} style={{ marginRight: 6 }} />
              Beautify / Format
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
            Copy
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} style={{ marginRight: 6 }} />
            Download
          </Button>
        </div>
      </div>

      {/* Validation Status Indicator */}
      {validationResult.isValid ? (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#22C55E',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>Valid JSON Syntax</span>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            color: '#EF4444',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
            <AlertCircle size={18} />
            <span>
              Invalid JSON Syntax
              {validationResult.error && ` at Line ${validationResult.error.line}, Column ${validationResult.error.column}`}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#F87171' }}>
            {validationResult.error?.message}
          </div>
          {validationResult.fixSuggestion && (
            <div style={{ fontSize: 12, color: 'var(--ink-2, #A1A1AA)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, color: 'var(--brand, #6060E8)' }}>Suggestion:</span>
              <span>{validationResult.fixSuggestion}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Editor Textarea */}
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
          JSON Payload
        </span>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste or type JSON to validate and inspect syntax..."
          rows={16}
          style={{
            width: '100%',
            background: 'var(--bg, #09090B)',
            border: `1px solid ${validationResult.isValid ? 'var(--border, #27272A)' : 'rgba(239, 68, 68, 0.4)'}`,
            borderRadius: 8,
            padding: 14,
            color: 'var(--ink, #FFFFFF)',
            fontSize: 13,
            fontFamily: 'var(--font-mono, monospace)',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
