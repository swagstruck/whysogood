'use client';
import React, { useState, useMemo } from 'react';
import { CalendarDays, ArrowLeftRight, Copy, Check, Clock, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { formatNumber, copyToClipboard } from '@/lib/utils';
import { calcDateDiff } from '@/lib/calculators/engines';

export default function DateDifferenceTool() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [includeEndDay, setIncludeEndDay] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleSwap = () => {
    const temp = startDate;
    setStartDate(endDate);
    setEndDate(temp);
  };

  const handleAddDays = (days: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setEndDate(d.toISOString().split('T')[0]);
  };

  const diffData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    // Apply end day inclusion if checked
    let effEnd = new Date(end);
    if (includeEndDay) {
      effEnd.setDate(effEnd.getDate() + 1);
    }

    const res = calcDateDiff(start, effEnd);
    const isPast = end < start;

    return {
      ...res,
      isPast,
    };
  }, [startDate, endDate, includeEndDay]);

  const handleCopy = () => {
    if (!diffData) return;
    const text = `Difference: ${diffData.years} yrs, ${diffData.months} mos, ${diffData.days} days (${formatNumber(diffData.totalDays)} total days, ${formatNumber(diffData.businessDays)} business days).`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied date difference to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Select Dates
            </h3>
            <Button variant="ghost" size="sm" onClick={handleSwap} icon={<ArrowLeftRight size={14} />}>
              Swap Dates
            </Button>
          </div>

          {/* Start Date */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Start Date</label>
              <button
                onClick={() => setStartDate(todayStr)}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Today
              </button>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-base"
              style={{ width: '100%', height: 42, fontSize: 15 }}
            />
          </div>

          {/* End Date */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>End Date</label>
              <button
                onClick={() => setEndDate(todayStr)}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Today
              </button>
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-base"
              style={{ width: '100%', height: 42, fontSize: 15 }}
            />
          </div>

          {/* Quick presets for End Date */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
              Add to Start Date:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: '+7 Days', days: 7 },
                { label: '+30 Days', days: 30 },
                { label: '+90 Days', days: 90 },
                { label: '+180 Days', days: 180 },
                { label: '+1 Year', days: 365 },
              ].map((btn) => (
                <button
                  key={btn.days}
                  onClick={() => handleAddDays(btn.days)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'var(--bg-2)',
                    color: 'var(--ink-2)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Include End Day Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={includeEndDay}
              onChange={(e) => setIncludeEndDay(e.target.checked)}
              style={{ accentColor: 'var(--brand)' }}
            />
            Include end date in calculation (+1 day)
          </label>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {diffData && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Total Duration</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1.2 }}>
                  {diffData.years > 0 && `${diffData.years} yrs `}
                  {diffData.months > 0 && `${diffData.months} mos `}
                  {diffData.days} days
                </div>
              </div>

              {/* Working vs Weekend Days Pill */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>
                    <Briefcase size={13} style={{ color: 'var(--brand)' }} /> Business Days
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>
                    {formatNumber(diffData.businessDays)}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>Weekend Days</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
                    {formatNumber(diffData.weekendDays)}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Units */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total Days</div>
                  <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{formatNumber(diffData.totalDays)}</strong>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total Weeks</div>
                  <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{formatNumber(diffData.weeks)}</strong>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total Hours</div>
                  <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{formatNumber(diffData.hours)}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}