'use client';
import React, { useState, useMemo } from 'react';
import { Wallet, Copy, Check, Sparkles, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCurrency, formatNumber, copyToClipboard } from '@/lib/utils';
import { calcEmi } from '@/lib/calculators/engines';

type LoanPreset = 'personal' | 'home' | 'car' | 'education';

export default function LoanCalculatorTool() {
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [interestRate, setInterestRate] = useState<number>(10.5);
  const [tenureYears, setTenureYears] = useState<number>(5);
  const [extraMonthly, setExtraMonthly] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const applyPreset = (preset: LoanPreset) => {
    switch (preset) {
      case 'home':
        setLoanAmount(5000000);
        setInterestRate(8.5);
        setTenureYears(20);
        setExtraMonthly(2000);
        break;
      case 'car':
        setLoanAmount(800000);
        setInterestRate(9.0);
        setTenureYears(5);
        setExtraMonthly(0);
        break;
      case 'personal':
        setLoanAmount(500000);
        setInterestRate(12.0);
        setTenureYears(3);
        setExtraMonthly(0);
        break;
      case 'education':
        setLoanAmount(1500000);
        setInterestRate(9.5);
        setTenureYears(7);
        setExtraMonthly(0);
        break;
    }
  };

  const calculation = useMemo(() => {
    if (loanAmount <= 0 || interestRate <= 0 || tenureYears <= 0) return null;

    const baseMonths = tenureYears * 12;
    const baseEmiRes = calcEmi(loanAmount, interestRate, baseMonths);

    // If extra monthly payment is present, simulate accelerated payoff
    let actualMonths = baseMonths;
    let totalInterestWithPrepay = 0;
    let balance = loanAmount;
    const r = interestRate / 12 / 100;
    const acceleratedPayment = baseEmiRes.emi + extraMonthly;

    const yearlyData = [];
    let currentYearInterest = 0;
    let currentYearPrincipal = 0;

    for (let m = 1; m <= baseMonths; m++) {
      if (balance <= 0) {
        actualMonths = m - 1;
        break;
      }
      const interest = balance * r;
      let principal = acceleratedPayment - interest;
      if (principal > balance) {
        principal = balance;
      }
      balance -= principal;
      totalInterestWithPrepay += interest;
      currentYearInterest += interest;
      currentYearPrincipal += principal;

      if (m % 12 === 0 || m === baseMonths || balance <= 0) {
        yearlyData.push({
          year: Math.ceil(m / 12),
          principalPaid: currentYearPrincipal,
          interestPaid: currentYearInterest,
          balanceRemaining: Math.max(0, balance),
        });
        currentYearInterest = 0;
        currentYearPrincipal = 0;
      }
    }

    const interestSaved = Math.max(0, baseEmiRes.totalInterest - totalInterestWithPrepay);
    const monthsSaved = Math.max(0, baseMonths - actualMonths);
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remMonthsSaved = monthsSaved % 12;

    const principalPct = Math.round((loanAmount / (loanAmount + totalInterestWithPrepay)) * 100);
    const interestPct = 100 - principalPct;

    return {
      monthlyPayment: baseEmiRes.emi,
      totalPayment: loanAmount + totalInterestWithPrepay,
      totalInterest: totalInterestWithPrepay,
      interestSaved,
      monthsSaved,
      yearsSaved,
      remMonthsSaved,
      yearlyData,
      principalPct,
      interestPct,
    };
  }, [loanAmount, interestRate, tenureYears, extraMonthly]);

  const handleCopy = () => {
    if (!calculation) return;
    const text = `Loan: ${formatCurrency(loanAmount)} | Monthly: ${formatCurrency(calculation.monthlyPayment)} | Total Cost: ${formatCurrency(calculation.totalPayment)}`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied loan summary to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Quick Loan Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>Presets:</span>
        {[
          { id: 'personal' as LoanPreset, label: 'Personal Loan (12%)' },
          { id: 'car' as LoanPreset, label: 'Auto / Car Loan (9%)' },
          { id: 'home' as LoanPreset, label: 'Home Loan (8.5%)' },
          { id: 'education' as LoanPreset, label: 'Education Loan (9.5%)' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className="c-btn"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 500,
              background: 'var(--bg-2)',
              color: 'var(--ink-2)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Principal */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Loan Amount</label>
              <input
                type="number"
                value={loanAmount}
                step={25000}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="input-base"
                style={{ width: 140, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={50000} max={10000000} step={25000} value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Interest */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Annual Interest Rate (%)</label>
              <input
                type="number"
                value={interestRate}
                step={0.1}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={1} max={25} step={0.25} value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Term in Years */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Loan Term (Years)</label>
              <input
                type="number"
                value={tenureYears}
                min={1}
                max={30}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={1} max={30} step={1} value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
          </div>

          {/* Extra Monthly Prepayment */}
          <div style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} style={{ color: 'var(--brand)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Extra Monthly Prepayment</span>
              </div>
              <input
                type="number"
                value={extraMonthly}
                step={500}
                min={0}
                onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value)))}
                className="input-base"
                style={{ width: 100, height: 30, textAlign: 'right' }}
              />
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              Pay extra each month to reduce loan tenure and save on interest.
            </span>
          </div>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {calculation && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Regular Monthly Payment</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
                  {formatCurrency(calculation.monthlyPayment)}
                </div>
              </div>

              {/* Extra Prepayment Savings Badge */}
              {extraMonthly > 0 && calculation.interestSaved > 0 && (
                <div style={{ padding: '12px 14px', background: 'var(--pos-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--pos)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pos)', fontWeight: 700, fontSize: 13 }}>
                    <TrendingDown size={16} /> Prepayment Impact:
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>
                    You save <strong>{formatCurrency(calculation.interestSaved)}</strong> in interest and pay off the loan{' '}
                    <strong>{calculation.yearsSaved > 0 ? `${calculation.yearsSaved} yr ` : ''}{calculation.remMonthsSaved} mo earlier!</strong>
                  </div>
                </div>
              )}

              {/* Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Principal Borrowed</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(loanAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Interest Paid</span>
                  <strong style={{ color: 'var(--color-warning, #f59e0b)' }}>+{formatCurrency(calculation.totalInterest)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Cost of Loan</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(calculation.totalPayment)}</strong>
                </div>
              </div>

              {/* Progress Split Bar */}
              <div>
                <div style={{ height: 10, width: '100%', background: 'var(--bg-3, #333)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${calculation.principalPct}%`, background: 'var(--brand)' }} />
                  <div style={{ width: `${calculation.interestPct}%`, background: 'var(--color-warning, #f59e0b)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                  <span>Principal ({calculation.principalPct}%)</span>
                  <span>Interest ({calculation.interestPct}%)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Yearly Amortization Table */}
      {calculation && (
        <div className="c-card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
            Yearly Loan Balance Schedule
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--ink-3)' }}>
                  <th style={{ padding: '8px 12px' }}>Year</th>
                  <th style={{ padding: '8px 12px' }}>Principal Paid</th>
                  <th style={{ padding: '8px 12px' }}>Interest Paid</th>
                  <th style={{ padding: '8px 12px' }}>Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {calculation.yearlyData.map((row) => (
                  <tr key={row.year} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>Year {row.year}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(row.principalPaid)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-warning, #f59e0b)' }}>{formatCurrency(row.interestPaid)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(row.balanceRemaining)}</td>
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