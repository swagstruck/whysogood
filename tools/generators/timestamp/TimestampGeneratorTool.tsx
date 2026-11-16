'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { copyToClipboard } from '@/lib/utils';
import {
  Clock,
  Copy,
  Check,
  RotateCw,
  Play,
  Pause,
  Calendar,
  Globe,
  ArrowRightLeft,
  Sparkles,
  Timer,
} from 'lucide-react';

interface TimestampSnapshot {
  unixSec: number;
  unixMs: number;
  iso: string;
  utc: string;
  local: string;
}

function getSnapshot(date: Date = new Date()): TimestampSnapshot {
  const ms = date.getTime();
  return {
    unixSec: Math.floor(ms / 1000),
    unixMs: ms,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(undefined, {
      dateStyle: 'full',
      timeStyle: 'long',
    }),
  };
}

// Format relative difference
function formatRelative(targetMs: number, nowMs: number): string {
  const diffSec = Math.round((targetMs - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
  return rtf.format(Math.round(diffDays / 365), 'year');
}

export default function TimestampGeneratorTool() {
  const toast = useToast();

  // Live ticking state
  const [liveNow, setLiveNow] = useState<TimestampSnapshot>(getSnapshot());
  const [isTicking, setIsTicking] = useState<boolean>(true);

  // Conversion 1: Unix to Human Date
  const [unixInput, setUnixInput] = useState<string>('');
  
  // Conversion 2: Human Date to Unix
  const [dateInput, setDateInput] = useState<string>('');

  // Offset calculator
  const [offsetValue, setOffsetValue] = useState<number>(1);
  const [offsetUnit, setOffsetUnit] = useState<'hours' | 'days' | 'weeks' | 'months'>('hours');
  const [offsetDirection, setOffsetDirection] = useState<'add' | 'sub'>('add');

  // Copy tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live timer interval
  useEffect(() => {
    if (!isTicking) return;
    const timer = setInterval(() => {
      setLiveNow(getSnapshot());
    }, 1000);
    return () => clearInterval(timer);
  }, [isTicking]);

  // Set default datetime-local value on mount
  useEffect(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setDateInput(d.toISOString().slice(0, 16));
    setUnixInput(Math.floor(Date.now() / 1000).toString());
  }, []);

  const handleCopy = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Parse user Unix timestamp (auto-detect seconds, ms, or us)
  const parsedUnixDate = useMemo(() => {
    const raw = unixInput.trim();
    if (!raw || isNaN(Number(raw))) return null;

    let num = Number(raw);
    let detectedUnit = 'seconds';

    // Nanoseconds (19 digits)
    if (num > 1e17) {
      num = Math.floor(num / 1e6);
      detectedUnit = 'nanoseconds';
    }
    // Microseconds (16 digits)
    else if (num > 1e14) {
      num = Math.floor(num / 1000);
      detectedUnit = 'microseconds';
    }
    // Milliseconds (13 digits)
    else if (num > 1e11) {
      detectedUnit = 'milliseconds';
    }
    // Seconds (10 digits)
    else {
      num = num * 1000;
      detectedUnit = 'seconds';
    }

    const d = new Date(num);
    if (isNaN(d.getTime())) return null;

    return {
      date: d,
      detectedUnit,
      snapshot: getSnapshot(d),
      relative: formatRelative(d.getTime(), Date.now()),
      dayOfWeek: d.toLocaleDateString(undefined, { weekday: 'long' }),
      isLeapYear: (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0,
    };
  }, [unixInput]);

  // Parse user DateTime input to timestamps
  const parsedDateTime = useMemo(() => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return getSnapshot(d);
  }, [dateInput]);

  // Calculate relative offset date
  const offsetResult = useMemo(() => {
    const d = new Date();
    const mult = offsetDirection === 'add' ? 1 : -1;
    if (offsetUnit === 'hours') {
      d.setHours(d.getHours() + mult * offsetValue);
    } else if (offsetUnit === 'days') {
      d.setDate(d.getDate() + mult * offsetValue);
    } else if (offsetUnit === 'weeks') {
      d.setDate(d.getDate() + mult * offsetValue * 7);
    } else if (offsetUnit === 'months') {
      d.setMonth(d.getMonth() + mult * offsetValue);
    }
    return getSnapshot(d);
  }, [offsetValue, offsetUnit, offsetDirection]);

  // Major World Timezones
  const worldTimes = useMemo(() => {
    const now = new Date();
    const zones = [
      { city: 'UTC / GMT', zone: 'UTC' },
      { city: 'New York (EST/EDT)', zone: 'America/New_York' },
      { city: 'London (GMT/BST)', zone: 'Europe/London' },
      { city: 'Tokyo (JST)', zone: 'Asia/Tokyo' },
      { city: 'Mumbai (IST)', zone: 'Asia/Kolkata' },
      { city: 'Sydney (AEST/AEDT)', zone: 'Australia/Sydney' },
    ];
    return zones.map((z) => ({
      city: z.city,
      time: now.toLocaleTimeString('en-US', {
        timeZone: z.zone,
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      date: now.toLocaleDateString('en-US', {
        timeZone: z.zone,
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [liveNow.unixSec]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Live Epoch Clock Card */}
      <div className="c-card" style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Pulsing live dot */}
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: isTicking ? 'var(--pos)' : 'var(--warn)',
                boxShadow: isTicking ? '0 0 8px var(--pos)' : 'none',
                display: 'inline-block',
              }}
            />
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              Current Real-Time Timestamp
            </h2>
            <span className="c-badge c-badge--neutral">
              {isTicking ? 'Live Sync' : 'Paused'}
            </span>
          </div>

          <button
            onClick={() => setIsTicking((t) => !t)}
            className="c-btn c-btn--ghost c-btn--sm"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isTicking ? <Pause size={13} /> : <Play size={13} />}
            <span>{isTicking ? 'Pause' : 'Resume'}</span>
          </button>
        </div>

        {/* Live formats list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Unix Timestamp (Seconds)', value: liveNow.unixSec.toString(), key: 'sec', highlight: true },
            { label: 'Unix Timestamp (Milliseconds)', value: liveNow.unixMs.toString(), key: 'ms' },
            { label: 'ISO 8601 (UTC)', value: liveNow.iso, key: 'iso' },
            { label: 'RFC 2822 / GMT Format', value: liveNow.utc, key: 'utc' },
            { label: 'Local System Time', value: liveNow.local, key: 'local' },
          ].map((row) => (
            <div
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: row.highlight ? 'var(--bg-3)' : 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
                  {row.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: row.highlight ? 18 : 14,
                    fontWeight: row.highlight ? 700 : 500,
                    color: row.highlight ? 'var(--brand)' : 'var(--ink)',
                    wordBreak: 'break-all',
                  }}
                >
                  {row.value}
                </span>
              </div>

              <button
                onClick={() => handleCopy(row.value, row.key)}
                className="c-btn c-btn--ghost c-btn--sm"
                style={{ flexShrink: 0 }}
                title="Copy value"
              >
                {copiedKey === row.key ? <Check size={14} color="var(--pos)" /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Way Interactive Converters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Converter 1: Unix to Date */}
        <div className="c-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ArrowRightLeft size={16} color="var(--brand-500)" />
            <span>Unix Timestamp → Human Date</span>
          </h3>

          <div className="c-field">
            <label className="c-field__label">Enter Timestamp (Seconds, MS, or NS)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="c-field__input"
                placeholder="e.g. 1700000000"
                value={unixInput}
                onChange={(e) => setUnixInput(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                onClick={() => setUnixInput(Math.floor(Date.now() / 1000).toString())}
                className="c-btn c-btn--ghost c-btn--sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                Now
              </button>
            </div>
            {parsedUnixDate && (
              <span className="c-field__hint">
                Auto-detected unit: <strong>{parsedUnixDate.detectedUnit}</strong>
              </span>
            )}
          </div>

          {/* Results Output */}
          {parsedUnixDate ? (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: 'var(--ink-2)', fontSize: 11 }}>UTC Date & Time:</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>
                  {parsedUnixDate.snapshot.utc}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--ink-2)', fontSize: 11 }}>Local Time:</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>
                  {parsedUnixDate.snapshot.local}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ color: 'var(--ink-2)' }}>Relative:</span>
                <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                  {parsedUnixDate.relative}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-2)' }}>Day of Week:</span>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>
                  {parsedUnixDate.dayOfWeek}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                padding: 20,
                textAlign: 'center',
                color: 'var(--ink-3)',
                fontSize: 13,
                background: 'var(--bg-3)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Enter a valid integer Unix timestamp above
            </div>
          )}
        </div>

        {/* Converter 2: Date to Unix */}
        <div className="c-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Calendar size={16} color="var(--brand-500)" />
            <span>Human Date → Unix Timestamp</span>
          </h3>

          <div className="c-field">
            <label className="c-field__label">Pick Date & Time</label>
            <input
              type="datetime-local"
              className="c-field__input"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <span className="c-field__hint">Parsed using your browser&apos;s local timezone.</span>
          </div>

          {/* Results Output */}
          {parsedDateTime ? (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 2,
                  }}
                >
                  <span style={{ color: 'var(--ink-2)', fontSize: 11 }}>Epoch (Seconds):</span>
                  <button
                    onClick={() =>
                      handleCopy(parsedDateTime.unixSec.toString(), 'parseSec')
                    }
                    className="c-btn c-btn--ghost c-btn--sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                  >
                    {copiedKey === 'parseSec' ? <Check size={12} color="var(--pos)" /> : <Copy size={12} />}
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--brand)',
                  }}
                >
                  {parsedDateTime.unixSec}
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 2,
                  }}
                >
                  <span style={{ color: 'var(--ink-2)', fontSize: 11 }}>Epoch (Milliseconds):</span>
                  <button
                    onClick={() =>
                      handleCopy(parsedDateTime.unixMs.toString(), 'parseMs')
                    }
                    className="c-btn c-btn--ghost c-btn--sm"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                  >
                    {copiedKey === 'parseMs' ? <Check size={12} color="var(--pos)" /> : <Copy size={12} />}
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {parsedDateTime.unixMs}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--ink-2)', fontSize: 11 }}>ISO 8601 UTC:</span>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    wordBreak: 'break-all',
                  }}
                >
                  {parsedDateTime.iso}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                padding: 20,
                textAlign: 'center',
                color: 'var(--ink-3)',
                fontSize: 13,
                background: 'var(--bg-3)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Select a date and time above
            </div>
          )}
        </div>
      </div>

      {/* World Timezones Reference Table */}
      <div className="c-card" style={{ padding: 20 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Globe size={16} color="var(--brand-500)" />
          <span>Major Global Timezones</span>
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {worldTimes.map((w) => (
            <div
              key={w.city}
              style={{
                padding: '12px 14px',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
                {w.city}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--brand)',
                }}
              >
                {w.time}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{w.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
