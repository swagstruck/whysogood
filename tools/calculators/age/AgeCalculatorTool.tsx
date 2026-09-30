'use client';
import React, { useState, useMemo } from 'react';
import { Cake, Calendar, Sparkles, Clock, Copy, Check, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, formatNumber } from '@/lib/utils';
import { calcAge } from '@/lib/calculators/engines';

export default function AgeCalculatorTool() {
  const [dob, setDob] = useState<string>('1998-06-15');
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const ageData = useMemo(() => {
    const birthDate = new Date(dob);
    const targetDate = new Date(asOf);
    if (isNaN(birthDate.getTime()) || isNaN(targetDate.getTime()) || birthDate > targetDate) {
      return null;
    }

    const res = calcAge(birthDate, targetDate);
    const totalHours = res.totalDays * 24;
    const totalWeeks = Math.floor(res.totalDays / 7);
    const totalMonths = res.years * 12 + res.months;

    // Day of the week born
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const birthDayOfWeek = daysOfWeek[birthDate.getDay()];

    // Next birthday details
    const nextBdayYear = targetDate.getFullYear() + (
      targetDate.getMonth() > birthDate.getMonth() || 
      (targetDate.getMonth() === birthDate.getMonth() && targetDate.getDate() > birthDate.getDate()) ? 1 : 0
    );
    const nextBday = new Date(nextBdayYear, birthDate.getMonth(), birthDate.getDate());
    const nextBdayDayOfWeek = daysOfWeek[nextBday.getDay()];

    // Milestone days
    const milestones = [10000, 15000, 20000, 25000].map(days => {
      const milestoneDate = new Date(birthDate.getTime() + days * 24 * 60 * 60 * 1000);
      const passed = targetDate >= milestoneDate;
      return { days, date: milestoneDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), passed };
    });

    return {
      ...res,
      totalHours,
      totalWeeks,
      totalMonths,
      birthDayOfWeek,
      nextBdayDayOfWeek,
      milestones,
    };
  }, [dob, asOf]);

  const handleCopy = () => {
    if (!ageData) return;
    const summary = `Age: ${ageData.years} years, ${ageData.months} months, ${ageData.days} days (${formatNumber(ageData.totalDays)} days total). Zodiac: ${ageData.zodiacSign}. Next birthday in ${ageData.nextBirthday}.`;
    copyToClipboard(summary);
    setCopied(true);
    toast.success('Copied age summary to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Inputs Grid */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Date Selectors Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
            Select Dates
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="input-base"
              style={{ width: '100%', height: 42, fontSize: 15 }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Age as of Date
              </label>
              <button
                onClick={() => setAsOf(new Date().toISOString().split('T')[0])}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reset to Today
              </button>
            </div>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="input-base"
              style={{ width: '100%', height: 42, fontSize: 15 }}
            />
          </div>

          {ageData && (
            <div style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <Cake size={20} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                Born on a <strong>{ageData.birthDayOfWeek}</strong> • Zodiac: <strong>{ageData.zodiacSign}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Primary Age Result Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {ageData ? (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Exact Age</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1.2 }}>
                  {ageData.years} <span style={{ fontSize: '0.6em', fontWeight: 600, color: 'var(--ink-2)' }}>years</span>{' '}
                  {ageData.months} <span style={{ fontSize: '0.6em', fontWeight: 600, color: 'var(--ink-2)' }}>months</span>{' '}
                  {ageData.days} <span style={{ fontSize: '0.6em', fontWeight: 600, color: 'var(--ink-2)' }}>days</span>
                </div>
              </div>

              {/* Next Birthday Banner */}
              <div style={{ padding: '12px 16px', background: 'var(--brand-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Sparkles size={20} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)' }}>Next Birthday</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    In {ageData.nextBirthday} (on a {ageData.nextBdayDayOfWeek})
                  </div>
                </div>
              </div>

              {/* Units Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total Days</div>
                  <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{formatNumber(ageData.totalDays)}</strong>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total Weeks</div>
                  <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{formatNumber(ageData.totalWeeks)}</strong>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Total Hours</div>
                  <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{formatNumber(ageData.totalHours)}</strong>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>
              Please select a valid birth date in the past.
            </div>
          )}
        </div>
      </div>

      {/* Life Milestones Card */}
      {ageData && (
        <div className="c-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
            Life Milestones
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {ageData.milestones.map((m) => (
              <div
                key={m.days}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{formatNumber(m.days)} Days</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{m.date}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: m.passed ? 'var(--pos-subtle)' : 'var(--bg)',
                    color: m.passed ? 'var(--pos)' : 'var(--ink-3)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {m.passed ? 'Reached' : 'Upcoming'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}