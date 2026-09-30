'use client';
import React, { useState, useMemo } from 'react';
import { Tag, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCurrency, formatNumber, copyToClipboard } from '@/lib/utils';
import { calcDiscount, calcDiscountFromPrices } from '@/lib/calculators/engines';

export default function DiscountCalculatorTool() {
  const [mode, setMode] = useState<'percent' | 'find_pct'>('percent');
  const [originalPrice, setOriginalPrice] = useState<number>(2500);
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [salePrice, setSalePrice] = useState<number>(1800);
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const discountData = useMemo(() => {
    if (originalPrice <= 0) return null;

    if (mode === 'percent') {
      const primaryDiscount = (originalPrice * discountPercent) / 100;
      const intermediatePrice = originalPrice - primaryDiscount;
      const secondDiscount = (intermediatePrice * extraDiscount) / 100;
      const finalPrice = Math.max(0, intermediatePrice - secondDiscount);
      const totalSavings = originalPrice - finalPrice;
      const effectiveSavingPct = (totalSavings / originalPrice) * 100;

      return {
        finalPrice,
        totalSavings,
        effectiveSavingPct,
        primaryDiscount,
        secondDiscount,
      };
    } else {
      const res = calcDiscountFromPrices(originalPrice, salePrice);
      return {
        finalPrice: salePrice,
        totalSavings: res.discountAmount,
        effectiveSavingPct: res.savingPercent,
        primaryDiscount: res.discountAmount,
        secondDiscount: 0,
      };
    }
  }, [originalPrice, discountPercent, salePrice, extraDiscount, mode]);

  const handleCopy = () => {
    if (!discountData) return;
    const text = `Original: ${formatCurrency(originalPrice)} | Final Price: ${formatCurrency(discountData.finalPrice)} | Saved: ${formatCurrency(discountData.totalSavings)} (${formatNumber(discountData.effectiveSavingPct, 1)}% off)`;
    copyToClipboard(text);
    setCopied(true);
    toast.success('Copied discount details to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const cheatPercentages = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setMode('percent')}
          className="c-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'percent' ? 600 : 500,
            background: mode === 'percent' ? 'var(--brand)' : 'var(--bg-2)',
            color: mode === 'percent' ? '#ffffff' : 'var(--ink-2)',
            border: mode === 'percent' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Calculate Sale Price (% Off)
        </button>
        <button
          onClick={() => setMode('find_pct')}
          className="c-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: mode === 'find_pct' ? 600 : 500,
            background: mode === 'find_pct' ? 'var(--brand)' : 'var(--bg-2)',
            color: mode === 'find_pct' ? '#ffffff' : 'var(--ink-2)',
            border: mode === 'find_pct' ? '1px solid var(--brand)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Find Discount % from Price
        </button>
      </div>

      {/* Main Grid: Controls + Results */}
      <div
        className="tool-split-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}
      >
        {/* Controls Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Original Price */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              Original Price (₹)
            </label>
            <input
              type="number"
              value={originalPrice}
              min={1}
              step={50}
              onChange={(e) => setOriginalPrice(Number(e.target.value))}
              className="input-base"
              style={{ width: '100%', height: 42, fontSize: 16, fontWeight: 700 }}
            />
          </div>

          {mode === 'percent' ? (
            <>
              {/* Discount Percentage Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Discount (%)</label>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>{discountPercent}%</span>
                </div>
                <input
                  type="range" min={1} max={90} step={1} value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  <span>5%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                </div>
              </div>

              {/* Extra Stacking Discount */}
              <div style={{ padding: 14, background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Extra Coupon / Stackable %</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      value={extraDiscount}
                      min={0}
                      max={50}
                      onChange={(e) => setExtraDiscount(Math.max(0, Number(e.target.value)))}
                      className="input-base"
                      style={{ width: 80, height: 30, textAlign: 'right', paddingRight: 22 }}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-3)' }}>%</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  E.g., an additional 10% coupon applied on top of the discounted price.
                </span>
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                Sale Price / Discounted Price (₹)
              </label>
              <input
                type="number"
                value={salePrice}
                min={0}
                step={50}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="input-base"
                style={{ width: '100%', height: 42, fontSize: 16, fontWeight: 700 }}
              />
            </div>
          )}
        </div>

        {/* Results Card */}
        <div className="c-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center' }}>
          {discountData && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Final Price You Pay</span>
                  <Button variant="ghost" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 'clamp(2.25rem, 5vw, 3rem)', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {formatCurrency(discountData.finalPrice)}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--ink-3)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {formatCurrency(originalPrice)}
                  </span>
                </div>
              </div>

              {/* Total Savings Highlight Badge */}
              <div style={{ padding: '12px 16px', background: 'var(--pos-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--pos)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag size={18} style={{ color: 'var(--pos)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pos)' }}>Total Savings</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--pos)' }}>
                    {formatCurrency(discountData.totalSavings)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--pos)' }}>
                    ({formatNumber(discountData.effectiveSavingPct, 1)}% Off)
                  </div>
                </div>
              </div>

              {/* Breakdown Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
                  <span>Original Price</span>
                  <strong style={{ color: 'var(--ink)' }}>{formatCurrency(originalPrice)}</strong>
                </div>
                {extraDiscount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
                      <span>Initial Discount ({discountPercent}%)</span>
                      <span>-{formatCurrency(discountData.primaryDiscount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
                      <span>Extra Coupon ({extraDiscount}%)</span>
                      <span>-{formatCurrency(discountData.secondDiscount)}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Discount Table */}
      <div className="c-card" style={{ padding: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
          Discount Cheat Sheet for {formatCurrency(originalPrice)}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
          {cheatPercentages.map((pct) => {
            const savings = (originalPrice * pct) / 100;
            const pay = originalPrice - savings;
            return (
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
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{pct}% OFF</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
                  {formatCurrency(pay)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--pos)', marginTop: 2 }}>
                  Save {formatCurrency(savings)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}