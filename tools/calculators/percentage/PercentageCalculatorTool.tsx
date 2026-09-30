'use client';
import React, { useState, useMemo } from 'react';
import { Percent, Copy, Check, ArrowRight, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, formatNumber } from '@/lib/utils';
import { calcPercentage, calcPercentageOf, calcPercentageChange, calcPercentageIncrease, calcPercentageDecrease } from '@/lib/calculators/engines';

type Mode = 'percent_of' | 'what_percent' | 'percent_change' | 'add_subtract';

export default function PercentageCalculatorTool() {
  const [mode, setMode] = useState<Mode>('percent_of');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  // Mode 1: What is X% of Y?
  const [m1Pct, setM1Pct] = useState<number>(15);
  const [m1Val, setM1Val] = useState<number>(200);

  // Mode 2: X is what % of Y?
  const [m2Part, setM2Part] = useState<number>(45);
  const [m2Whole, setM2Whole] = useState<number>(180);

  // Mode 3: % Change from X to Y
  const [m3From, setM3From] = useState<number>(100);
  const [m3To, setM3To] = useState<number>(135);

  // Mode 4: Add or subtract X% from Y
  const [m4Val, setM4Val] = useState<number>(500);
  const [m4Pct, setM4Pct] = useState<number>(18);
  const [m4Op, setM4Op] = useState<'add' | 'subtract'>('add');

  const result = useMemo(() => {
    switch (mode) {
      case 'percent_of': {
        const val = calcPercentage(m1Val, m1Pct);
        return {
          hero: formatNumber(val, 2),
          label: `${m1Pct}% of ${m1Val}`,
          formula: `(${m1Pct} ÷ 100) × ${m1Val} = ${formatNumber(val, 4)}`,
          copyText: `${m1Pct}% of ${m1Val} = ${formatNumber(val, 2)}`,
        };
      }
      case 'what_percent': {
        const val = calcPercentageOf(m2Part, m2Whole);
        return {
          hero: `${formatNumber(val, 2)}%`,
          label: `${m2Part} is what % of ${m2Whole}`,
          formula: `(${m2Part} ÷ ${m2Whole}) × 100 = ${formatNumber(val, 4)}%`,
          copyText: `${m2Part} is ${formatNumber(val, 2)}% of ${m2Whole}`,
        };
      }
      case 'percent_change': {
        const val = calcPercentageChange(m3From, m3To);
        const isInc = val >= 0;
        return {
          hero: `${isInc ? '+' : ''}${formatNumber(val, 2)}%`,
          label: `${isInc ? 'Increase' : 'Decrease'} from ${m3From} to ${m3To}`,
          formula: `((${m3To} - ${m3From}) ÷ ${m3From}) × 100 = ${formatNumber(val, 4)}%`,
          diff: formatNumber(m3To - m3From, 2),
          isIncrease: isInc,
          copyText: `Percentage change from ${m3From} to ${m3To} = ${isInc ? '+' : ''}${formatNumber(val, 2)}%`,
        };
      }
      case 'add_subtract': {
        const val = m4Op === 'add' ? calcPercentageIncrease(m4Val, m4Pct) : calcPercentageDecrease(m4Val, m4Pct);
        const changeAmount = (m4Val * m4Pct) / 100;
        return {
          hero: formatNumber(val, 2),
          label: `${m4Val} ${m4Op === 'add' ? '+' : '-'} ${m4Pct}%`,
          formula: `${m4Val} ${m4Op === 'add' ? '+' : '-'} (${m4Pct}% of ${m4Val} = ${formatNumber(changeAmount, 2)}) = ${formatNumber(val, 2)}`,
          copyText: `${m4Val} ${m4Op === 'add' ? '+' : '-'} ${m4Pct}% = ${formatNumber(val, 2)}`,
        };
      }
    }
  }, [mode, m1Pct, m1Val, m2Part, m2Whole, m3From, m3To, m4Val, m4Pct, m4Op]);

  const handleCopy = () => {
    copyToClipboard(result.copyText);
    setCopied(true);
    toast.success('Copied calculation to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Base value for quick reference table
  const refBase = mode === 'percent_of' ? m1Val : mode === 'add_subtract' ? m4Val : 100;
  const commonPercentages = [5, 10, 15, 20, 25, 30, 40, 50, 75];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'percent_of' as Mode, label: '% of a Value', desc: 'What is X% of Y?' },
          { id: 'what_percent' as Mode, label: 'What % is X of Y', desc: 'Find percentage share' },
          { id: 'percent_change' as Mode, label: '% Change', desc: 'Increase or decrease' },
          { id: 'add_subtract' as Mode, label: 'Add / Subtract %', desc: 'Markup or markdown' },
        ].map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className="c-btn"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                background: active ? 'var(--brand)' : 'var(--bg-2)',
                color: active ? '#ffffff' : 'var(--ink-2)',
                border: active ? '1px solid var(--brand)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {mode === 'percent_of' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Percentage (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={m1Pct}
                    onChange={(e) => setM1Pct(Number(e.target.value))}
                    className="input-base"
                    style={{ width: '100%', height: 42, paddingRight: 36, fontSize: 15 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontWeight: 600 }}>%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={1} value={m1Pct}
                  onChange={(e) => setM1Pct(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 8, accentColor: 'var(--brand)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Of Value
                </label>
                <input
                  type="number"
                  value={m1Val}
                  onChange={(e) => setM1Val(Number(e.target.value))}
                  className="input-base"
                  style={{ width: '100%', height: 42, fontSize: 15 }}
                />
              </div>
            </>
          )}

          {mode === 'what_percent' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Part Value (X)
                </label>
                <input
                  type="number"
                  value={m2Part}
                  onChange={(e) => setM2Part(Number(e.target.value))}
                  className="input-base"
                  style={{ width: '100%', height: 42, fontSize: 15 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Total / Whole Value (Y)
                </label>
                <input
                  type="number"
                  value={m2Whole}
                  onChange={(e) => setM2Whole(Number(e.target.value))}
                  className="input-base"
                  style={{ width: '100%', height: 42, fontSize: 15 }}
                />
              </div>
            </>
          )}

          {mode === 'percent_change' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Initial Value (From)
                </label>
                <input
                  type="number"
                  value={m3From}
                  onChange={(e) => setM3From(Number(e.target.value))}
                  className="input-base"
                  style={{ width: '100%', height: 42, fontSize: 15 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Final Value (To)
                </label>
                <input
                  type="number"
                  value={m3To}
                  onChange={(e) => setM3To(Number(e.target.value))}
                  className="input-base"
                  style={{ width: '100%', height: 42, fontSize: 15 }}
                />
              </div>
            </>
          )}

          {mode === 'add_subtract' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Base Value
                </label>
                <input
                  type="number"
                  value={m4Val}
                  onChange={(e) => setM4Val(Number(e.target.value))}
                  className="input-base"
                  style={{ width: '100%', height: 42, fontSize: 15 }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Operation</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setM4Op('add')}
                      style={{
                        padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: m4Op === 'add' ? 'var(--brand)' : 'var(--bg-2)', color: m4Op === 'add' ? '#fff' : 'var(--ink-2)', border: '1px solid var(--border)'
                      }}
                    >
                      + Add %
                    </button>
                    <button
                      onClick={() => setM4Op('subtract')}
                      style={{
                        padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: m4Op === 'subtract' ? 'var(--brand)' : 'var(--bg-2)', color: m4Op === 'subtract' ? '#fff' : 'var(--ink-2)', border: '1px solid var(--border)'
                      }}
                    >
                      - Subtract %
                    </button>
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={m4Pct}
                    onChange={(e) => setM4Pct(Number(e.target.value))}
                    className="input-base"
                    style={{ width: '100%', height: 42, paddingRight: 36, fontSize: 15 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontWeight: 600 }}>%</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{result.label}</span>
              <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
              {result.hero}
            </div>
          </div>

          <div style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)' }}>
              Formula & Calculation
            </span>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--ink)', marginTop: 4 }}>
              {result.formula}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference Percentages Table */}
      <div className="c-card" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
          Quick Percentages of {refBase}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
          {commonPercentages.map((pct) => (
            <div
              key={pct}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{pct}%</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand)', marginTop: 2 }}>
                {formatNumber(calcPercentage(refBase, pct), 2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}