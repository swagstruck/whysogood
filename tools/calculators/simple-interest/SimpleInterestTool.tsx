'use client';
import React, { useState, useMemo } from 'react';
import { TrendingUp, Copy, Check, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCurrency, formatNumber, copyToClipboard } from '@/lib/utils';
import { calcSimpleInterest, calcCompoundInterest } from '@/lib/calculators/engines';

export default function SimpleInterestTool() {
  const [principal, setPrincipal] = useState<number>(50000);
  const [rate, setRate] = useState<number>(7.5);
  const [timeValue, setTimeValue] = useState<number>(5);
  const [timeUnit, setTimeUnit] = useState<'years' | 'months' | 'days'>('years');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const yearsEquivalent = useMemo(() => {
    if (timeUnit === 'years') return timeValue;
    if (timeUnit === 'months') return timeValue / 12;
    return timeValue / 365;
  }, [timeValue, timeUnit]);

  const calculation = useMemo(() => {
    if (principal <= 0 || rate <= 0 || yearsEquivalent <= 0) return null;
    const res = calcSimpleInterest(principal, rate, yearsEquivalent);

    // Compound interest comparison at same rate
    const ciRes = calcCompoundInterest(principal, rate, yearsEquivalent, 'annually');
    const ciDifference = Math.max(0, ciRes.totalInterest - res.interest);

    // Yearly schedule
    const schedule = [];
    const totalPeriods = Math.ceil(yearsEquivalent);
    const annualInterest = (principal * rate) / 100;
    for (let y = 1; y <= totalPeriods; y++) {
      const yearInt = y === totalPeriods && yearsEquivalent % 1 !== 0 
        ? (yearsEquivalent - (totalPeriods - 1)) * annualInterest 
        : annualInterest;
      const cumInt = Math.min(res.interest, y * annualInterest);
      schedule.push({
        year: y,
        interestEarned: yearInt,
        cumulativeInterest: cumInt,
        totalBalance: principal + cumInt,
      });
    }

    const principalPct = Math.round((principal / res.totalAmount) * 100);
    const interestPct = 100 - principalPct;

    return {
      ...res,
      ciDifference,
      schedule,
      principalPct,
      interestPct,
    };
  }, [principal, rate, yearsEquivalent]);

  const handleCopy = () => {
    if (!calculation) return;
    const text = `Principal: ${formatCurrency(principal)} | Simple Interest: ${formatCurrency(calculation.interest)} | Total Amount: ${formatCurrency(calculation.totalAmount)} (${timeValue} ${timeUnit} @ ${rate}%)`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied Simple Interest summary to clipboard!');
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
          {/* Principal Amount */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Principal Amount</label>
              <input
                type="number"
                value={principal}
                step={5000}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="input-base"
                style={{ width: 140, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={1000} max={1000000} step={1000} value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Interest Rate */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Annual Interest Rate (%)</label>
              <input
                type="number"
                value={rate}
                step={0.1}
                onChange={(e) => setRate(Number(e.target.value))}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={1} max={30} step={0.25} value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Time Period + Unit Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Time Period</label>
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg-2)', padding: 2, borderRadius: 'var(--radius-sm)' }}>
                  {(['years', 'months', 'days'] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setTimeUnit(unit)}
                      style={{
                        padding: '2px 8px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
                        background: timeUnit === unit ? 'var(--brand)' : 'transparent', color: timeUnit === unit ? '#fff' : 'var(--ink-2)'
                      }}
                    >
                      {unit.charAt(0).toUpperCase() + unit.slice(1, 2)}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                value={timeValue}
                min={1}
                onChange={(e) => setTimeValue(Number(e.target.value))}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range"
              min={1}
              max={timeUnit === 'years' ? 30 : timeUnit === 'months' ? 120 : 365}
              value={timeValue}
              onChange={(e) => setTimeValue(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {calculation && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Total Simple Interest</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: 'var(--pos)', letterSpacing: '-0.02em', marginTop: 4 }}>
                  +{formatCurrency(calculation.interest)}
                </div>
              </div>

              {/* Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Principal Amount</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(principal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Repayment Value</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(calculation.totalAmount)}</strong>
                </div>
              </div>

              {/* Formula Display Box */}
              <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase' }}>Formula (P × R × T) / 100:</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)', marginTop: 4 }}>
                  ({formatCurrency(principal)} × {rate}% × {formatNumber(yearsEquivalent, 2)} yrs) ÷ 100 = <strong>{formatCurrency(calculation.interest)}</strong>
                </div>
              </div>

              {/* Compound vs Simple Comparison */}
              {calculation.ciDifference > 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-2)', padding: '8px 12px', background: 'var(--brand-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  💡 With annual compound interest at {rate}%, you would earn an extra <strong>+{formatCurrency(calculation.ciDifference)}</strong>.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Yearly Schedule Table */}
      {calculation && (
        <div className="c-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
            Yearly Linear Interest Accrual
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--ink-3)' }}>
                  <th style={{ padding: '8px 12px' }}>Period</th>
                  <th style={{ padding: '8px 12px' }}>Interest Earned</th>
                  <th style={{ padding: '8px 12px' }}>Cumulative Interest</th>
                  <th style={{ padding: '8px 12px' }}>Total Balance</th>
                </tr>
              </thead>
              <tbody>
                {calculation.schedule.map((row) => (
                  <tr key={row.year} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>Year {row.year}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--pos)' }}>+{formatCurrency(row.interestEarned)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(row.cumulativeInterest)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(row.totalBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}