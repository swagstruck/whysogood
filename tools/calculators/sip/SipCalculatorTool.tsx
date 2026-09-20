'use client';
import React, { useState } from 'react';
import { TrendingUp, PiggyBank, ShieldCheck } from 'lucide-react';
import { FieldMessage } from '@/components/ui/FieldMessage';
import { formatCurrency, formatNumber } from '@/lib/utils';

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function monthlyErr(v: number): string | undefined {
  if (!v || v < 100) return 'Minimum monthly investment is ₹100.';
  if (v > 1000000) return 'Maximum monthly investment is ₹10,00,000.';
  return undefined;
}
function rateErr(v: number): string | undefined {
  if (v < 0.1) return 'Return rate must be at least 0.1%.';
  if (v > 50) return 'Return rate cannot exceed 50%.';
  return undefined;
}
function tenureErr(v: number): string | undefined {
  if (!v || v < 1) return 'Investment period must be at least 1 year.';
  if (v > 50) return 'Investment period cannot exceed 50 years.';
  return undefined;
}

export default function SipCalculatorTool() {
  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(5000);
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(12);
  const [tenureYears, setTenureYears] = useState<number>(10);

  // Typed number field state (separate from slider-bound values so users can clear & retype)
  const [miRaw, setMiRaw] = useState('5000');
  const [rrRaw, setRrRaw] = useState('12');
  const [tyRaw, setTyRaw] = useState('10');
  const [touched, setTouched] = useState({ mi: false, rr: false, ty: false });

  const miErr = touched.mi ? monthlyErr(monthlyInvestment) : undefined;
  const rrErr = touched.rr ? rateErr(expectedReturnRate) : undefined;
  const tyErr = touched.ty ? tenureErr(tenureYears) : undefined;

  const i = expectedReturnRate / 12 / 100;
  const n = tenureYears * 12;
  const totalInvestment = monthlyInvestment * n;
  const maturityAmount = i > 0
    ? monthlyInvestment * (((Math.pow(1 + i, n) - 1) / i) * (1 + i))
    : totalInvestment;
  const wealthGained = Math.max(0, maturityAmount - totalInvestment);
  const investedPct = maturityAmount > 0 ? (totalInvestment / maturityAmount) * 100 : 100;
  const returnPct = 100 - investedPct;

  const yearlyBreakdown = [];
  for (let yr = 1; yr <= tenureYears; yr++) {
    const months = yr * 12;
    const inv = monthlyInvestment * months;
    const mat = i > 0 ? monthlyInvestment * (((Math.pow(1 + i, months) - 1) / i) * (1 + i)) : inv;
    yearlyBreakdown.push({ year: yr, invested: inv, returns: mat - inv, total: mat });
  }

  const sliderRow = (
    label: string,
    value: number,
    rawVal: string,
    setRaw: (v: string) => void,
    setValue: (v: number) => void,
    min: number, max: number, step: number,
    touchKey: keyof typeof touched,
    errMsg: string | undefined,
    display: string,
    suffix: string,
  ) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
        <input
          type="number"
          value={rawVal}
          min={min}
          max={max}
          step={step}
          onChange={e => {
            setRaw(e.target.value);
            const n = Number(e.target.value);
            if (!isNaN(n)) setValue(n);
            setTouched(t => ({ ...t, [touchKey]: true }));
          }}
          onBlur={() => {
            setTouched(t => ({ ...t, [touchKey]: true }));
            const clamped = clamp(value, min, max);
            setValue(clamped);
            setRaw(String(clamped));
          }}
          className={`input-base${errMsg ? ' input-base--error' : ''}`}
          aria-invalid={errMsg ? 'true' : undefined}
          style={{
            width: 110, height: 32, padding: '0 8px', fontSize: 14,
            boxSizing: 'border-box', textAlign: 'right',
          }}
        />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={clamp(value, min, max)}
        onChange={e => {
          const v = Number(e.target.value);
          setValue(v);
          setRaw(String(v));
        }}
        style={{ width: '100%', accentColor: 'var(--color-accent)' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-faint)', marginTop: 2 }}>
        <span>{suffix === '%' ? `${min}%` : `₹${min.toLocaleString('en-IN')}`}</span>
        <span>{suffix === '%' ? `${max}%` : `₹${max.toLocaleString('en-IN')}`}</span>
      </div>
      {errMsg && <FieldMessage variant="error">{errMsg}</FieldMessage>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Controls Card */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sliderRow('Monthly Investment', monthlyInvestment, miRaw, setMiRaw, setMonthlyInvestment, 500, 100000, 500, 'mi', miErr, formatCurrency(monthlyInvestment), '₹')}
          {sliderRow('Expected Return Rate (p.a.)', expectedReturnRate, rrRaw, setRrRaw, setExpectedReturnRate, 1, 30, 0.5, 'rr', rrErr, `${expectedReturnRate}%`, '%')}
          {sliderRow('Time Period (years)', tenureYears, tyRaw, setTyRaw, setTenureYears, 1, 35, 1, 'ty', tyErr, `${tenureYears} yr`, 'yr')}

          {(miErr || rrErr || tyErr) && (
            <FieldMessage variant="warning">Fix the errors above to see accurate projections.</FieldMessage>
          )}
        </div>

        {/* Results Card */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          <div>
            <span style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 500 }}>Total Maturity Value</span>
            <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', marginTop: 4 }}>
              {formatCurrency(maturityAmount)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 12px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--color-muted)' }}>Invested Amount</span>
              <strong style={{ color: 'var(--color-text)' }}>{formatCurrency(totalInvestment)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 12px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--color-muted)' }}>Est. Returns</span>
              <strong style={{ color: 'var(--color-success)' }}>+{formatCurrency(wealthGained)}</strong>
            </div>
          </div>
          <div>
            <div style={{ height: 10, width: '100%', background: 'var(--color-surface3)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${investedPct}%`, background: 'var(--color-accent)', transition: 'width 0.2s' }} />
              <div style={{ width: `${returnPct}%`, background: 'var(--color-success)', transition: 'width 0.2s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-muted)', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />
                <span>Invested ({investedPct.toFixed(0)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                <span>Gain ({returnPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Growth Table */}
      <div className="card" style={{ padding: 20, overflow: 'hidden' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text)' }}>Yearly Growth Schedule</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '8px 12px' }}>Year</th>
                <th style={{ padding: '8px 12px' }}>Invested Amount</th>
                <th style={{ padding: '8px 12px' }}>Estimated Returns</th>
                <th style={{ padding: '8px 12px' }}>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {yearlyBreakdown.map(row => (
                <tr key={row.year} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>Year {row.year}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text)' }}>{formatCurrency(row.invested)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-success)' }}>+{formatCurrency(row.returns)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-text)' }}>{formatCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
