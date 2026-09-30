'use client';
import React, { useState, useMemo } from 'react';
import { Landmark, Copy, Check, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCurrency, formatNumber, copyToClipboard } from '@/lib/utils';
import { calcFd, FdCompounding } from '@/lib/calculators/engines';

export default function FdCalculatorTool() {
  const [principal, setPrincipal] = useState<number>(200000);
  const [baseRate, setBaseRate] = useState<number>(7.1);
  const [isSeniorCitizen, setIsSeniorCitizen] = useState<boolean>(false);
  const [tenureYears, setTenureYears] = useState<number>(5);
  const [compounding, setCompounding] = useState<FdCompounding>('quarterly');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const compoundingOptions = [
    { label: 'Quarterly Compounding (Standard Indian Banks)', value: 'quarterly' },
    { label: 'Monthly Compounding', value: 'monthly' },
    { label: 'Half-Yearly Compounding', value: 'half-yearly' },
    { label: 'Annual Compounding', value: 'annually' },
  ];

  const effectiveRate = isSeniorCitizen ? baseRate + 0.5 : baseRate;

  const fdData = useMemo(() => {
    if (principal <= 0 || effectiveRate <= 0 || tenureYears <= 0) return null;
    const res = calcFd(principal, effectiveRate, tenureYears, compounding);

    const principalPct = Math.round((principal / res.maturityAmount) * 100);
    const interestPct = 100 - principalPct;
    const effectiveYield = ((res.maturityAmount - principal) / (principal * tenureYears)) * 100;

    return {
      ...res,
      principalPct,
      interestPct,
      effectiveYield,
    };
  }, [principal, effectiveRate, tenureYears, compounding]);

  const handleCopy = () => {
    if (!fdData) return;
    const text = `FD Investment: ${formatCurrency(principal)} | Maturity Value: ${formatCurrency(fdData.maturityAmount)} | Interest Earned: ${formatCurrency(fdData.totalInterest)} (${tenureYears} yrs @ ${effectiveRate}% p.a.)`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied FD calculation to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Senior Citizen Toggle Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCheck size={18} style={{ color: 'var(--brand)' }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Senior Citizen Benefit</span>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Senior citizens (age 60+) receive an additional +0.50% interest rate.</div>
          </div>
        </div>
        <button
          onClick={() => setIsSeniorCitizen(!isSeniorCitizen)}
          className="c-btn"
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: 12,
            fontWeight: 600,
            background: isSeniorCitizen ? 'var(--brand)' : 'var(--bg)',
            color: isSeniorCitizen ? '#ffffff' : 'var(--ink)',
            border: isSeniorCitizen ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {isSeniorCitizen ? 'Senior Citizen (+0.5% Applied)' : 'Regular Citizen'}
        </button>
      </div>

      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Investment Amount */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Deposit Amount (₹)</label>
              <input
                type="number"
                value={principal}
                step={10000}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="input-base"
                style={{ width: 140, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={10000} max={5000000} step={10000} value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              <span>₹10,000</span>
              <span>₹25 Lakhs</span>
              <span>₹50 Lakhs</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Interest Rate {isSeniorCitizen ? `(${baseRate}% + 0.5%)` : '(% p.a.)'}
              </label>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>
                {effectiveRate.toFixed(2)}%
              </div>
            </div>
            <input
              type="range" min={3} max={12} step={0.05} value={baseRate}
              onChange={(e) => setBaseRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              <span>3%</span>
              <span>7%</span>
              <span>12%</span>
            </div>
          </div>

          {/* Tenure Years */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Investment Period (Years)</label>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>{tenureYears} Years</span>
            </div>
            <input
              type="range" min={1} max={15} step={1} value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              <span>1 Year</span>
              <span>5 Years</span>
              <span>15 Years</span>
            </div>
          </div>

          {/* Compounding Frequency */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              Compounding Frequency
            </label>
            <Select
              value={compounding}
              onChange={(e) => setCompounding(e.target.value as FdCompounding)}
              options={compoundingOptions}
            />
          </div>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {fdData && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Total Maturity Value</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
                  {formatCurrency(fdData.maturityAmount)}
                </div>
              </div>

              {/* Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Deposited Amount</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(principal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Interest Earned</span>
                  <strong style={{ color: 'var(--pos)' }}>+{formatCurrency(fdData.totalInterest)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Annual Effective Yield</span>
                  <strong style={{ color: 'var(--brand)' }}>{formatNumber(fdData.effectiveYield, 2)}% p.a.</strong>
                </div>
              </div>

              {/* Progress Split Bar */}
              <div>
                <div style={{ height: 10, width: '100%', background: 'var(--bg-3, #333)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${fdData.principalPct}%`, background: 'var(--brand)' }} />
                  <div style={{ width: `${fdData.interestPct}%`, background: 'var(--pos)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                  <span>Principal ({fdData.principalPct}%)</span>
                  <span>Interest ({fdData.interestPct}%)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Yearly Growth Schedule Table */}
      {fdData && (
        <div className="c-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
            Fixed Deposit Yearly Growth Schedule
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--ink-3)' }}>
                  <th style={{ padding: '8px 12px' }}>Year</th>
                  <th style={{ padding: '8px 12px' }}>Deposited Principal</th>
                  <th style={{ padding: '8px 12px' }}>Cumulative Interest</th>
                  <th style={{ padding: '8px 12px' }}>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {fdData.yearlyBreakdown.map((row) => (
                  <tr key={row.year} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>Year {row.year}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(principal)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--pos)' }}>+{formatCurrency(row.interest)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(row.amount)}</td>
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