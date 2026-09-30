'use client';
import React, { useState, useMemo } from 'react';
import { Banknote, Copy, Check, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCurrency, formatNumber, copyToClipboard } from '@/lib/utils';
import { calcEmi } from '@/lib/calculators/engines';

export default function EmiCalculatorTool() {
  const [loanAmount, setLoanAmount] = useState<number>(2500000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(20);
  const [tenureUnit, setTenureUnit] = useState<'years' | 'months'>('years');
  const [tenureMonthsVal, setTenureMonthsVal] = useState<number>(240);
  const [scheduleView, setScheduleView] = useState<'yearly' | 'monthly'>('yearly');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const totalMonths = tenureUnit === 'years' ? tenureYears * 12 : tenureMonthsVal;

  const emiData = useMemo(() => {
    if (loanAmount <= 0 || interestRate <= 0 || totalMonths <= 0) return null;
    const res = calcEmi(loanAmount, interestRate, totalMonths);

    // Compute yearly summary schedule
    const yearlySchedule = [];
    const numYears = Math.ceil(totalMonths / 12);
    for (let y = 1; y <= numYears; y++) {
      let principalPaid = 0;
      let interestPaid = 0;
      let endingBalance = 0;
      const startM = (y - 1) * 12;
      const endM = Math.min(y * 12, totalMonths);
      for (let m = startM; m < endM; m++) {
        const row = res.schedule[m];
        if (row) {
          principalPaid += row.principal;
          interestPaid += row.interest;
          endingBalance = row.balance;
        }
      }
      yearlySchedule.push({
        year: y,
        principalPaid,
        interestPaid,
        totalPayment: principalPaid + interestPaid,
        endingBalance,
      });
    }

    const principalPct = Math.round((loanAmount / res.totalPayment) * 100);
    const interestPct = 100 - principalPct;

    return {
      ...res,
      yearlySchedule,
      principalPct,
      interestPct,
    };
  }, [loanAmount, interestRate, totalMonths]);

  const handleCopy = () => {
    if (!emiData) return;
    const text = `Loan Amount: ${formatCurrency(loanAmount)} | Monthly EMI: ${formatCurrency(emiData.emi)} | Total Interest: ${formatCurrency(emiData.totalInterest)} | Total Payment: ${formatCurrency(emiData.totalPayment)}`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied EMI calculation to clipboard!');
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
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Loan Amount */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Loan Amount</label>
              <input
                type="number"
                value={loanAmount}
                min={10000}
                max={50000000}
                step={50000}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              <span>₹50K</span>
              <span>₹50L</span>
              <span>₹1 Cr</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Interest Rate (% p.a.)</label>
              <input
                type="number"
                value={interestRate}
                min={1}
                max={30}
                step={0.1}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            <input
              type="range" min={1} max={20} step={0.1} value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              <span>1%</span>
              <span>10%</span>
              <span>20%</span>
            </div>
          </div>

          {/* Tenure */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Loan Tenure</label>
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg-2)', padding: 2, borderRadius: 'var(--radius-sm)' }}>
                  <button
                    onClick={() => setTenureUnit('years')}
                    style={{
                      padding: '2px 8px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
                      background: tenureUnit === 'years' ? 'var(--brand)' : 'transparent', color: tenureUnit === 'years' ? '#fff' : 'var(--ink-2)'
                    }}
                  >
                    Yr
                  </button>
                  <button
                    onClick={() => {
                      setTenureMonthsVal(tenureYears * 12);
                      setTenureUnit('months');
                    }}
                    style={{
                      padding: '2px 8px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
                      background: tenureUnit === 'months' ? 'var(--brand)' : 'transparent', color: tenureUnit === 'months' ? '#fff' : 'var(--ink-2)'
                    }}
                  >
                    Mo
                  </button>
                </div>
              </div>
              <input
                type="number"
                value={tenureUnit === 'years' ? tenureYears : tenureMonthsVal}
                min={1}
                max={tenureUnit === 'years' ? 35 : 420}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (tenureUnit === 'years') setTenureYears(val);
                  else setTenureMonthsVal(val);
                }}
                className="input-base"
                style={{ width: 80, height: 32, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
            {tenureUnit === 'years' ? (
              <input
                type="range" min={1} max={30} step={1} value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand)' }}
              />
            ) : (
              <input
                type="range" min={6} max={360} step={6} value={tenureMonthsVal}
                onChange={(e) => setTenureMonthsVal(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand)' }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              <span>{tenureUnit === 'years' ? '1 Year' : '6 Mo'}</span>
              <span>{tenureUnit === 'years' ? '30 Years' : '360 Mo'}</span>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {emiData && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Monthly Loan EMI</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
                  {formatCurrency(emiData.emi)}
                </div>
              </div>

              {/* Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Principal Amount</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(loanAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Interest Payable</span>
                  <strong style={{ color: 'var(--color-warning, #f59e0b)' }}>+{formatCurrency(emiData.totalInterest)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total Amount (Principal + Interest)</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(emiData.totalPayment)}</strong>
                </div>
              </div>

              {/* Progress Split Bar */}
              <div>
                <div style={{ height: 10, width: '100%', background: 'var(--bg-3, #333)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${emiData.principalPct}%`, background: 'var(--brand)', transition: 'width 0.2s' }} />
                  <div style={{ width: `${emiData.interestPct}%`, background: 'var(--color-warning, #f59e0b)', transition: 'width 0.2s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />
                    <span>Principal ({emiData.principalPct}%)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-warning, #f59e0b)' }} />
                    <span>Interest ({emiData.interestPct}%)</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amortization Schedule Table */}
      {emiData && (
        <div className="c-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Amortization Schedule
            </h4>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
              <button
                onClick={() => setScheduleView('yearly')}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
                  background: scheduleView === 'yearly' ? 'var(--brand)' : 'transparent', color: scheduleView === 'yearly' ? '#fff' : 'var(--ink-2)'
                }}
              >
                Yearly View
              </button>
              <button
                onClick={() => setScheduleView('monthly')}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
                  background: scheduleView === 'monthly' ? 'var(--brand)' : 'transparent', color: scheduleView === 'monthly' ? '#fff' : 'var(--ink-2)'
                }}
              >
                Monthly View
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-1)', zIndex: 1 }}>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--ink-3)' }}>
                  <th style={{ padding: '8px 12px' }}>{scheduleView === 'yearly' ? 'Year' : 'Month'}</th>
                  <th style={{ padding: '8px 12px' }}>Principal Paid</th>
                  <th style={{ padding: '8px 12px' }}>Interest Paid</th>
                  <th style={{ padding: '8px 12px' }}>Total Payment</th>
                  <th style={{ padding: '8px 12px' }}>Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {scheduleView === 'yearly' ? (
                  emiData.yearlySchedule.map((row) => (
                    <tr key={row.year} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>Year {row.year}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(row.principalPaid)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-warning, #f59e0b)' }}>{formatCurrency(row.interestPaid)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(row.totalPayment)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(row.endingBalance)}</td>
                    </tr>
                  ))
                ) : (
                  emiData.schedule.slice(0, 120).map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>Month {row.month}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(row.principal)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-warning, #f59e0b)' }}>{formatCurrency(row.interest)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{formatCurrency(row.principal + row.interest)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(row.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {scheduleView === 'monthly' && emiData.schedule.length > 120 && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', marginTop: 8 }}>
              Showing first 120 months. Switch to Yearly View to see full loan lifetime.
            </div>
          )}
        </div>
      )}
    </div>
  );
}