'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Copy,
  Download,
  Trash2,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileCode2,
  ArrowRightLeft,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob, formatFileSize } from '@/lib/utils';

export interface DeveloperSplitPaneProps {
  inputLabel: string;
  inputValue: string;
  onInputChange: (val: string) => void;
  inputPlaceholder?: string;
  outputLabel: string;
  outputValue: string;
  outputPlaceholder?: string;
  onExecute: () => void;
  executeLabel?: string;
  executeIcon?: React.ReactNode;
  onClear: () => void;
  onLoadSample: () => void;
  optionsToolbar?: React.ReactNode;
  metrics?: {
    originalSize: number;
    minifiedSize: number;
    bytesSaved: number;
    reductionPercentage: number;
  } | null;
  error?: {
    message: string;
    line?: number;
    column?: number;
  } | null;
  downloadFilename: string;
  downloadMimeType: string;
  customOutputRenderer?: React.ReactNode;
}

export function DeveloperSplitPane({
  inputLabel,
  inputValue,
  onInputChange,
  inputPlaceholder = 'Paste code here...',
  outputLabel,
  outputValue,
  outputPlaceholder = 'Formatted output will appear here...',
  onExecute,
  executeLabel = 'Format',
  executeIcon,
  onClear,
  onLoadSample,
  optionsToolbar,
  metrics,
  error,
  downloadFilename,
  downloadMimeType,
  customOutputRenderer,
}: DeveloperSplitPaneProps) {
  const [copied, setCopied] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const isSyncingRef = useRef(false);

  const toast = useToast();

  // Copy handler
  const handleCopy = useCallback(async () => {
    if (!outputValue) return;
    try {
      await copyToClipboard(outputValue);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [outputValue, toast]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!outputValue) return;
    try {
      const blob = new Blob([outputValue], { type: downloadMimeType });
      downloadBlob(blob, downloadFilename);
      toast.success(`Downloaded ${downloadFilename}`);
    } catch {
      toast.error('Failed to download file');
    }
  }, [outputValue, downloadMimeType, downloadFilename, toast]);

  // Synchronized scrolling handlers
  const handleInputScroll = useCallback(() => {
    if (!syncScroll || isSyncingRef.current || !inputRef.current || !outputRef.current) return;
    const inputEl = inputRef.current;
    const outputEl = outputRef.current;
    const inputMax = inputEl.scrollHeight - inputEl.clientHeight;
    if (inputMax <= 0) return;
    const pct = inputEl.scrollTop / inputMax;
    isSyncingRef.current = true;
    const outputMax = outputEl.scrollHeight - outputEl.clientHeight;
    outputEl.scrollTop = pct * outputMax;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [syncScroll]);

  const handleOutputScroll = useCallback(() => {
    if (!syncScroll || isSyncingRef.current || !inputRef.current || !outputRef.current) return;
    const inputEl = inputRef.current;
    const outputEl = outputRef.current;
    const outputMax = outputEl.scrollHeight - outputEl.clientHeight;
    if (outputMax <= 0) return;
    const pct = outputEl.scrollTop / outputMax;
    isSyncingRef.current = true;
    const inputMax = inputEl.scrollHeight - inputEl.clientHeight;
    inputEl.scrollTop = pct * inputMax;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [syncScroll]);

  // Keyboard shortcuts: Cmd/Ctrl + Enter to execute, Cmd/Ctrl + Shift + C to copy, Escape to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onExecute();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopy();
      } else if (e.key === 'Escape' && isFullScreen) {
        e.preventDefault();
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExecute, handleCopy, isFullScreen]);

  // Handle Tab key inside input textarea
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newVal = inputValue.substring(0, start) + '  ' + inputValue.substring(end);
      onInputChange(newVal);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  const inputLines = inputValue ? inputValue.split('\n').length : 0;
  const outputLines = outputValue ? outputValue.split('\n').length : 0;

  const containerStyle: React.CSSProperties = isFullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'var(--bg, #0A0A0A)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
      };

  return (
    <div style={containerStyle}>
      {/* Top Action Toolbar */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-1, #141414)',
          border: '1px solid var(--border, #2A2A2A)',
          borderRadius: 'var(--radius-md, 14px)',
        }}
      >
        {/* Left Action Buttons & Custom Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={onExecute}
            icon={executeIcon ?? <Sparkles size={15} />}
            title="Execute (Ctrl/Cmd + Enter)"
          >
            {executeLabel}
          </Button>

          <Button
            variant="secondary"
            onClick={onLoadSample}
            icon={<FileCode2 size={15} />}
            title="Load realistic sample code"
          >
            Sample
          </Button>

          {optionsToolbar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {optionsToolbar}
            </div>
          )}
        </div>

        {/* Right Utility Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSyncScroll(!syncScroll)}
            icon={<ArrowRightLeft size={14} />}
            style={{
              color: syncScroll ? 'var(--brand, #6060e8)' : 'var(--ink-2, #A1A1A1)',
              background: syncScroll ? 'rgba(96, 96, 232, 0.12)' : 'transparent',
            }}
            title="Toggle Synchronized Scrolling"
          >
            Sync Scroll
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            disabled={!outputValue}
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            title="Copy Output (Ctrl/Cmd + Shift + C)"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={!outputValue}
            icon={<Download size={14} />}
            title={`Download ${downloadFilename}`}
          >
            Download
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            icon={<Trash2 size={14} />}
            title="Clear all text"
          >
            Clear
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullScreen(!isFullScreen)}
            icon={isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
          >
            {isFullScreen ? 'Exit' : 'Full'}
          </Button>
        </div>
      </div>

      {/* Metrics Banner (for minifiers or stats) */}
      {metrics && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 18px',
            background: 'var(--bg-2, #1C1C1C)',
            border: '1px solid var(--border, #2A2A2A)',
            borderRadius: 'var(--radius-md, 14px)',
            fontSize: 13,
            color: 'var(--ink, #FAFAFA)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={15} style={{ color: 'var(--brand, #6060e8)' }} />
              <span style={{ fontWeight: 600 }}>Compression Metrics:</span>
            </div>
            <div>
              <span style={{ color: 'var(--ink-2, #A1A1A1)' }}>Original: </span>
              <strong>{formatFileSize(metrics.originalSize)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--ink-2, #A1A1A1)' }}>Minified: </span>
              <strong>{formatFileSize(metrics.minifiedSize)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--ink-2, #A1A1A1)' }}>Saved: </span>
              <strong>{formatFileSize(metrics.bytesSaved)}</strong>
            </div>
          </div>

          <div
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              background: metrics.reductionPercentage > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(161, 161, 161, 0.15)',
              color: metrics.reductionPercentage > 0 ? 'var(--pos, #22c55e)' : 'var(--ink-2, #A1A1A1)',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {metrics.reductionPercentage}% Smaller
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 14px)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--neg, #ef4444)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Syntax Warning:</strong> {error.message}
            {error.line !== undefined && (
              <span style={{ opacity: 0.9 }}>
                {' '}
                (Line {error.line}{error.column !== undefined ? `, Col ${error.column}` : ''})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Editor Grid: Side-by-side or stacked on mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
          flex: isFullScreen ? 1 : 'unset',
        }}
      >
        {/* Input Pane */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--bg-1, #141414)',
            border: '1px solid var(--border, #2A2A2A)',
            borderRadius: 'var(--radius-md, 14px)',
            height: isFullScreen ? 'calc(100vh - 180px)' : 480,
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border, #2A2A2A)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ink-2, #A1A1A1)',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-2, #1C1C1C)',
            }}
          >
            <span>{inputLabel}</span>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-3, #666)' }}>
              <span>{inputLines} lines</span>
              <span>{inputValue.length} chars</span>
            </div>
          </div>

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onScroll={handleInputScroll}
            onKeyDown={handleInputKeyDown}
            placeholder={inputPlaceholder}
            spellCheck={false}
            style={{
              flex: 1,
              width: '100%',
              padding: 16,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--ink, #FAFAFA)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'none',
              boxSizing: 'border-box',
              tabSize: 2,
            }}
          />
        </div>

        {/* Output Pane */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--bg-1, #141414)',
            border: '1px solid var(--border, #2A2A2A)',
            borderRadius: 'var(--radius-md, 14px)',
            height: isFullScreen ? 'calc(100vh - 180px)' : 480,
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border, #2A2A2A)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ink-2, #A1A1A1)',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-2, #1C1C1C)',
            }}
          >
            <span>{outputLabel}</span>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--brand, #6060e8)' }}>
              <span>{outputLines} lines</span>
              <span>{outputValue.length} chars</span>
            </div>
          </div>

          {customOutputRenderer ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16,
                boxSizing: 'border-box',
              }}
            >
              {customOutputRenderer}
            </div>
          ) : (
            <textarea
              ref={outputRef}
              readOnly
              value={outputValue}
              onScroll={handleOutputScroll}
              placeholder={outputPlaceholder}
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                padding: 16,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--ink, #FAFAFA)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
