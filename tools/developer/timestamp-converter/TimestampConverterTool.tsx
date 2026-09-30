'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { convertTimestamp } from '@/lib/developer/utilities';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import {
  Copy,
  Clock,
  RotateCw,
  Check,
  Pause,
  Play,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export default function TimestampConverterTool() {
  const [currentNow, setCurrentNow] = useState<number>(Date.now());
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>(Math.floor(Date.now() / 1000).toString());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toast = useToast();

  // Clock ticker
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const converted = useMemo(() => {
    return convertTimestamp(inputVal);
  }, [inputVal]);

  const handleCopy = async (val: string | number, key: string) => {
    try {
      await copyToClipboard(String(val));
      setCopiedKey(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSetToNow = () => {
    setInputVal(Math.floor(Date.now() / 1000).toString());
    toast.success('Set to current timestamp');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Live Clock Card */}
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-subtle)',
              color: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Epoch Time
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ink)' }}>
              {Math.floor(currentNow / 1000)} <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 400 }}>seconds</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play size={14} style={{ marginRight: 6 }} /> : <Pause size={14} style={{ marginRight: 6 }} />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSetToNow}>
            <RotateCw size={14} style={{ marginRight: 6 }} />
            Set Input to Now
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleCopy(Math.floor(currentNow / 1000), 'current')}>
            {copiedKey === 'current' ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
            Copy Current
          </Button>
        </div>
      </div>

      {/* Input Field */}
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          Enter Unix Timestamp or Date String
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="e.g. 1700000000 or 2026-09-24T12:00:00.000Z"
            style={{
              flex: 1,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--ink)',
              fontSize: 14,
              fontFamily: 'var(--font-mono, monospace)',
              outline: 'none',
            }}
          />
          <Button variant="secondary" onClick={handleSetToNow}>
            Now
          </Button>
        </div>
      </div>

      {/* Error state */}
      {!converted.isValid && (
        <div
          style={{
            background: 'var(--neg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--neg)',
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>{converted.error || 'Invalid date/timestamp format'}</span>
        </div>
      )}

      {/* Converted Output Breakdown */}
      {converted.isValid && (
        <div
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            Converted Formats
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Unix Timestamp (seconds)', value: converted.unixSeconds, key: 'sec' },
              { label: 'Unix Timestamp (milliseconds)', value: converted.unixMillis, key: 'ms' },
              { label: 'ISO 8601 Extended', value: converted.iso, key: 'iso' },
              { label: 'UTC / GMT (RFC 7231)', value: converted.utc, key: 'utc' },
              { label: 'Local Timezone', value: converted.local, key: 'local' },
              { label: 'Relative Description', value: converted.relative, key: 'relative' },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 180 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ink)', wordBreak: 'break-all' }}>
                    {item.value}
                  </span>
                </div>

                <Button variant="ghost" size="sm" onClick={() => handleCopy(item.value, item.key)}>
                  {copiedKey === item.key ? <Check size={14} style={{ marginRight: 4 }} /> : <Copy size={14} style={{ marginRight: 4 }} />}
                  Copy
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
