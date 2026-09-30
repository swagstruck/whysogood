'use client';
import React, { useState, useMemo } from 'react';
import { Receipt, Copy, Check, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCurrency, formatNumber, copyToClipboard } from '@/lib/utils';
import { calcGstExclusive, calcGstInclusive, GstRate } from '@/lib/calculators/engines';

export default function GstCalculatorTool() {
  const [mode, setMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [amount, setAmount] = useState<number>(10000);
  const [gstRate, setGstRate] = useState<GstRate>(18);
  const [txType, setTxType] = useState<'intra' | 'inter'>('intra');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const standardRates: GstRate[] = [0, 3, 5, 12, 18, 28];

  const gstData = useMemo(() => {
    if (amount <= 0) return null;
    const res = mode === 'exclusive' 
      ? calcGstExclusive(amount, gstRate)
      : calcGstInclusive(amount, gstRate);

    return {
      ...res,
      cgst: res.gstAmount / 2,
      sgst: res.gstAmount / 2,
      igst: res.gstAmount,
    };
  }, [amount, gstRate, mode]);

  const handleCopy = () => {
    if (!gstData) return;
    const summary = `${mode === 'exclusive' ? 'GST Exclusive' : 'GST Inclusive'}: Base: ${formatCurrency(gstData.basePrice)} + GST (${gstRate}%): ${formatCurrency(gstData.gstAmount)} = Total: ${formatCurrency(gstData.totalPrice)}`;
    copyToClipboard(summary);
    setCopied(true);
    toast.success('Copied GST invoice summary to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setMode('exclusive')}
          className="c-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'exclusive' ? 600 : 500,
            background: mode === 'exclusive' ? 'var(--brand)' : 'var(--bg-2)',
            color: mode === 'exclusive' ? '#ffffff' : 'var(--ink-2)',
            border: mode === 'exclusive' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Add GST (Exclusive)
        </button>
        <button
          onClick={() => setMode('inclusive')}
          className="c-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'inclusive' ? 600 : 500,
            background: mode === 'inclusive' ? 'var(--brand)' : 'var(--bg-2)',
            color: mode === 'inclusive' ? '#ffffff' : 'var(--ink-2)',
            border: mode === 'inclusive' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Remove GST (Inclusive)
        </button>
      </div>

      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Amount Input */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              {mode === 'exclusive' ? 'Initial / Net Amount (₹)' : 'Total / Gross Amount with GST (₹)'}
            </label>
            <input
              type="number"
              value={amount}
              min={1}
              step={100}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="input-base"
              style={{ width: '100%', height: 42, fontSize: 16, fontWeight: 700 }}
            />
          </div>

          {/* GST Rate Buttons */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
              GST Rate Slab
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {standardRates.map((r) => (
                <button
                  key={r}
                  onClick={() => setGstRate(r)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: gstRate === r ? 'var(--brand)' : 'var(--bg-2)',
                    color: gstRate === r ? '#ffffff' : 'var(--ink)',
                    border: gstRate === r ? '1px solid var(--brand)' : '1px solid var(--border)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Type (Intra vs Inter state) */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              Supply Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setTxType('intra')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: txType === 'intra' ? 'var(--bg-2)' : 'transparent',
                  color: txType === 'intra' ? 'var(--ink)' : 'var(--ink-2)',
                  border: txType === 'intra' ? '1px solid var(--brand)' : '1px solid var(--border)',
                }}
              >
                Intra-State (CGST + SGST)
              </button>
              <button
                onClick={() => setTxType('inter')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: txType === 'inter' ? 'var(--bg-2)' : 'transparent',
                  color: txType === 'inter' ? 'var(--ink)' : 'var(--ink-2)',
                  border: txType === 'inter' ? '1px solid var(--brand)' : '1px solid var(--border)',
                }}
              >
                Inter-State (IGST)
              </button>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {gstData && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
                    {mode === 'exclusive' ? 'Total Invoice Amount' : 'Pre-Tax Net Amount'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
                  {formatCurrency(mode === 'exclusive' ? gstData.totalPrice : gstData.basePrice)}
                </div>
              </div>

              {/* Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Base Amount</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(gstData.basePrice)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--ink-2)' }}>Total GST ({gstRate}%)</span>
                  <strong style={{ color: 'var(--pos)' }}>+{formatCurrency(gstData.gstAmount)}</strong>
                </div>
                {txType === 'intra' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 4px' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      CGST ({gstRate / 2}%): <strong style={{ color: 'var(--ink)' }}>{formatCurrency(gstData.cgst)}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'right' }}>
                      SGST ({gstRate / 2}%): <strong style={{ color: 'var(--ink)' }}>{formatCurrency(gstData.sgst)}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '0 4px' }}>
                    IGST ({gstRate}%): <strong style={{ color: 'var(--ink)' }}>{formatCurrency(gstData.igst)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '10px 12px', background: 'var(--brand-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--brand)' }}>Total Final Price</span>
                  <strong style={{ fontSize: 16, color: 'var(--ink)' }}>{formatCurrency(gstData.totalPrice)}</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* GST Slabs Quick Reference Table */}
      <div className="c-card" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
          GST Rate Slabs in India
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                <th style={{ padding: '8px 12px' }}>Rate</th>
                <th style={{ padding: '8px 12px' }}>Applicability & Typical Goods/Services</th>
              </tr>
            </thead>
            <tbody>
              {[
                { rate: '0%', items: 'Essential food items, fresh milk, vegetables, unbranded grains, books, salt' },
                { rate: '3%', items: 'Gold, silver, platinum, coins, imitation jewelry' },
                { rate: '5%', items: 'Apparel (< ₹1,000), packaged food, economy flight tickets, tea, coffee, medicine' },
                { rate: '12%', items: 'Computers, processed food, mobile phones, business class tickets' },
                { rate: '18%', items: 'Software services, IT services, financial services, telecom, restaurants, industrial goods' },
                { rate: '28%', items: 'Luxury cars, motorcycles, air conditioners, refrigerators, gaming, tobacco' },
              ].map((row) => (
                <tr key={row.rate} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--brand)' }}>{row.rate}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{row.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}