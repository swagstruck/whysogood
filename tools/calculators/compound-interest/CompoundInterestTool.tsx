'use client';
import React, { useState, useMemo } from 'react';
import { TrendingUp, Copy, Check, Calendar, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCurrency, formatNumber, copyToClipboard } from '@/lib/utils';
import { calcCompoundInterest, CompoundFrequency } from '@/lib/calculators/engines';

export default function CompoundInterestTool() {
  const [principal, setPrincipal] = useState<number>(100000);
  const [annualRate, setAnnualRate] = useState<number>(10);
  const [years, setYears] = useState<number>(10);
  const [frequency, setFrequency] = useState<CompoundFrequency>('annually');
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const freqOptions = [
    { label: 'Annually (1/yr)', value: 'annually' },
    { label: 'Semi-Annually (2/yr)', value: 'semi-annually' },
    { label: 'Quarterly (4/yr)', value: 'quarterly' },
    { label: 'Monthly (12/yr)', value: 'monthly' },
    { label: 'Daily (365/yr)', value: 'daily' },
  ];

  const calculation = useMemo(() => {
    if (principal <= 0 || annualRate <= 0 || years <= 0) return null;

    const freqMap: Record<CompoundFrequency, number> = {
      'annually': 1,
      'semi-annually': 2,
      'quarterly': 4,
      'monthly': 12,
      'daily': 365,
    };
    const n = freqMap[frequency] || 1;
    const r = annualRate / 100;

    let totalPrincipal = principal;
    let balance = principal;
    const yearlyBreakdown = [];

    for (let y = 1; y <= years; y++) {
      const yearStartBalance = balance;
      let yearlyInterest = 0;
      let yearlyContributions = 0;

      // Simulate months in year for monthly additions + compounding
      for (let m = 1; m <= 12; m++) {
        balance += monthlyContribution;
        yearlyContributions += monthlyContribution;
        totalPrincipal += monthlyContribution;
      }

      // Compound for this year
      const compoundedBalance = (yearStartBalance + yearlyContributions / 2) * Math.pow(1 + r / n, n);
      yearlyInterest = compoundedBalance - (yearStartBalance + yearlyContributions);
      balance = compoundedBalance;

      yearlyBreakdown.push({
        year: y,
        invested: totalPrincipal,
        interestEarned: Math.max(0, balance - totalPrincipal),
        totalBalance: balance,
      });
    }

    const maturityAmount = balance;
    const totalInterest = Math.max(0, maturityAmount - totalPrincipal);
    const investedPct = Math.round((totalPrincipal / maturityAmount) * 100);
    const interestPct = 100 - investedPct;

    // Simple interest comparison
    const simpleInterestTotal = principal + (principal * r * years) + (monthlyContribution * 12 * years);
    const compoundAdvantage = Math.max(0, maturityAmount - simpleInterestTotal);

    return {
      totalPrincipal,
      maturityAmount,
      totalInterest,
      investedPct,
      interestPct,
      yearlyBreakdown,
      compoundAdvantage,
    };
  }, [principal, annualRate, years, frequency, monthlyContribution]);

  const handleCopy = () => {
    if (!calculation) return;
    const text = `Principal: ${formatCurrency(calculation.totalPrincipal)} | Maturity Amount: ${formatCurrency(calculation.maturityAmount)} | Compound Interest: ${formatCurrency(calculation.totalInterest)} (${years} yrs @ ${annualRate}%)`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied investment summary to clipboard!');
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
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Initial Principal</label>
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
              type="range" min={5000} max={2500000} step={5000} value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Annual Rate */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Annual Interest Rate (%)</label>
              <input
                type="number"
                value={annualRate}
                step={0.1}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={1} max={30} step={0.5} value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Time Period in Years */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Time Period (Years)</label>
              <input
                type="number"
                value={years}
                min={1}
                max={40}
                onChange={(e) => setYears(Number(e.target.value))}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={1} max={40} step={1} value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Compounding Frequency & Monthly Deposit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                Compounding Frequency
              </label>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as CompoundFrequency)}
                options={freqOptions}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                Monthly Deposit (Opt)
              </label>
              <input
                type="number"
                value={monthlyContribution}
                min={0}
                step={500}
                onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value)))}
                className="input-base"
                style={{ width: '100%', height: 36 }}
                placeholder="₹0"
              />
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {calculation && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Total Maturity Value</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
                  {formatCurrency(calculation.maturityAmount)}
                </div>
              </div>

              {/* Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Invested Principal</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(calculation.totalPrincipal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Compound Interest</span>
                  <strong style={{ color: 'var(--pos)' }}>+{formatCurrency(calculation.totalInterest)}</strong>
                </div>
              </div>

              {/* Split Bar */}
              <div>
                <div style={{ height: 10, width: '100%', background: 'var(--bg-3, #333)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${calculation.investedPct}%`, background: 'var(--brand)' }} />
                  <div style={{ width: `${calculation.interestPct}%`, background: 'var(--pos)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                  <span>Invested ({calculation.investedPct}%)</span>
                  <span>Gain ({calculation.interestPct}%)</span>
                </div>
              </div>

              {/* Compound vs Simple note */}
              {calculation.compoundAdvantage > 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-2)', padding: '8px 12px', background: 'var(--brand-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  ✨ Compounding earns you <strong>+{formatCurrency(calculation.compoundAdvantage)}</strong> more than simple interest over {years} years!
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Yearly Growth Schedule Table */}
      {calculation && (
        <div className="c-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
            Yearly Compound Growth Schedule
          </h4>
          <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-1)', zIndex: 1 }}>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--ink-3)' }}>
                  <th style={{ padding: '8px 12px' }}>Year</th>
                  <th style={{ padding: '8px 12px' }}>Total Invested</th>
                  <th style={{ padding: '8px 12px' }}>Total Interest Earned</th>
                  <th style={{ padding: '8px 12px' }}>Balance at End of Year</th>
                </tr>
              </thead>
              <tbody>
                {calculation.yearlyBreakdown.map((row) => (
                  <tr key={row.year} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>Year {row.year}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(row.invested)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--pos)' }}>+{formatCurrency(row.interestEarned)}</td>
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