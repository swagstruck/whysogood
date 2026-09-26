'use client';

import React, { useState, useMemo } from 'react';
import { generateCron, explainCron, getNextCronRuns } from '@/lib/developer/utilities';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard } from '@/lib/utils';
import {
  Copy,
  Clock,
  Calendar,
  Sparkles,
  Check,
  Timer,
  PlayCircle,
} from 'lucide-react';

const PRESETS = [
  { label: 'Every minute (* * * * *)', value: '* * * * *' },
  { label: 'Every 5 minutes (*/5 * * * *)', value: '*/5 * * * *' },
  { label: 'Every 15 minutes (*/15 * * * *)', value: '*/15 * * * *' },
  { label: 'Every hour (0 * * * *)', value: '0 * * * *' },
  { label: 'Every day at midnight (0 0 * * *)', value: '0 0 * * *' },
  { label: 'Every weekday at 9:00 AM (0 9 * * 1-5)', value: '0 9 * * 1-5' },
  { label: 'Every Sunday at midnight (0 0 * * 0)', value: '0 0 * * 0' },
  { label: 'First day of every month at midnight (0 0 1 * *)', value: '0 0 1 * *' },
];

export default function CronGeneratorTool() {
  const [minute, setMinute] = useState('*');
  const [hour, setHour] = useState('*');
  const [dayOfMonth, setDayOfMonth] = useState('*');
  const [month, setMonth] = useState('*');
  const [dayOfWeek, setDayOfWeek] = useState('*');
  const [copied, setCopied] = useState(false);

  const toast = useToast();

  const expression = useMemo(() => {
    return `${minute.trim() || '*'} ${hour.trim() || '*'} ${dayOfMonth.trim() || '*'} ${month.trim() || '*'} ${dayOfWeek.trim() || '*'}`;
  }, [minute, hour, dayOfMonth, month, dayOfWeek]);

  const explanation = useMemo(() => {
    return explainCron(expression);
  }, [expression]);

  const nextRuns = useMemo(() => {
    return getNextCronRuns(expression, 5);
  }, [expression]);

  const handleApplyPreset = (expr: string) => {
    const parts = expr.split(' ');
    if (parts.length === 5) {
      setMinute(parts[0]);
      setHour(parts[1]);
      setDayOfMonth(parts[2]);
      setMonth(parts[3]);
      setDayOfWeek(parts[4]);
      toast.success('Applied cron preset');
    }
  };

  const handleCopyExpression = async () => {
    try {
      await copyToClipboard(expression);
      setCopied(true);
      toast.success('Cron expression copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleRawExpressionChange = (val: string) => {
    const parts = val.trim().split(/\s+/);
    if (parts.length === 5) {
      setMinute(parts[0]);
      setHour(parts[1]);
      setDayOfMonth(parts[2]);
      setMonth(parts[3]);
      setDayOfWeek(parts[4]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Expression Display Card */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--ink-2, #A1A1AA)', fontWeight: 700, letterSpacing: '0.05em' }}>
              Generated Cron Expression
            </span>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--brand, #6060E8)', marginTop: 4 }}>
              {expression}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={handleCopyExpression}>
              {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
              Copy Expression
            </Button>
          </div>
        </div>

        {/* Human Readable Explanation */}
        <div
          style={{
            background: 'var(--bg, #09090B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--ink, #FFFFFF)',
            fontSize: 14,
          }}
        >
          <Timer size={18} color="var(--brand, #6060E8)" />
          <span style={{ fontWeight: 500 }}>{explanation}</span>
        </div>
      </div>

      {/* Preset Selector */}
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
          Standard Presets
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid var(--border, #27272A)',
                background: expression === p.value ? 'var(--brand, #6060E8)' : 'var(--bg, #09090B)',
                color: expression === p.value ? '#FFFFFF' : 'var(--ink, #E4E4E7)',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5-Field Visual Builder Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #A1A1AA)' }}>Minute (0-59)</span>
          <input
            type="text"
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            placeholder="*"
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 6,
              padding: '8px 10px',
              color: 'var(--ink, #FFFFFF)',
              fontSize: 14,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--ink-2, #71717A)' }}>e.g. *, */15, 0,30</span>
        </div>

        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #A1A1AA)' }}>Hour (0-23)</span>
          <input
            type="text"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            placeholder="*"
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 6,
              padding: '8px 10px',
              color: 'var(--ink, #FFFFFF)',
              fontSize: 14,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--ink-2, #71717A)' }}>e.g. *, 0, 9-17, */2</span>
        </div>

        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #A1A1AA)' }}>Day of Month (1-31)</span>
          <input
            type="text"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            placeholder="*"
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 6,
              padding: '8px 10px',
              color: 'var(--ink, #FFFFFF)',
              fontSize: 14,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--ink-2, #71717A)' }}>e.g. *, 1, 15, 1-15</span>
        </div>

        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #A1A1AA)' }}>Month (1-12)</span>
          <input
            type="text"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="*"
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 6,
              padding: '8px 10px',
              color: 'var(--ink, #FFFFFF)',
              fontSize: 14,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--ink-2, #71717A)' }}>e.g. *, 1, 1-6, */3</span>
        </div>

        <div
          style={{
            background: 'var(--bg-2, #18181B)',
            border: '1px solid var(--border, #27272A)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #A1A1AA)' }}>Day of Week (0-6)</span>
          <input
            type="text"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            placeholder="*"
            style={{
              background: 'var(--bg, #09090B)',
              border: '1px solid var(--border, #27272A)',
              borderRadius: 6,
              padding: '8px 10px',
              color: 'var(--ink, #FFFFFF)',
              fontSize: 14,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--ink-2, #71717A)' }}>0=Sun, 1=Mon, 1-5=M-F</span>
        </div>
      </div>

      {/* Next 5 Scheduled Executions */}
      <div
        style={{
          background: 'var(--bg-2, #18181B)',
          border: '1px solid var(--border, #27272A)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #FFFFFF)' }}>
          Next 5 Scheduled Executions (Estimated)
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {nextRuns.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg, #09090B)',
                border: '1px solid var(--border, #27272A)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--ink, #E4E4E7)',
              }}
            >
              <Calendar size={14} color="var(--brand, #6060E8)" />
              <span style={{ color: 'var(--brand, #6060E8)', fontWeight: 600 }}>#{i + 1}</span>
              <span>{new Date(r).toUTCString()} ({new Date(r).toLocaleString()})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
