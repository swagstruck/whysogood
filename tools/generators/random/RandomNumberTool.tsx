'use client';

import React, { useState, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { copyToClipboard } from '@/lib/utils';
import {
  Dice5,
  Copy,
  Check,
  RotateCw,
  Coins,
  Sparkles,
  Trophy,
  Sliders,
  Hash,
  ArrowUpDown,
  History,
} from 'lucide-react';

type RandomMode = 'range' | 'decimal' | 'dice' | 'coin' | 'lottery';

export default function RandomNumberTool() {
  const toast = useToast();
  const [mode, setMode] = useState<RandomMode>('range');

  // Mode 1: Range (Integers)
  const [minInt, setMinInt] = useState<number>(1);
  const [maxInt, setMaxInt] = useState<number>(100);
  const [countInt, setCountInt] = useState<number>(1);
  const [uniqueInt, setUniqueInt] = useState<boolean>(false);

  // Mode 2: Decimal
  const [minDec, setMinDec] = useState<number>(0);
  const [maxDec, setMaxDec] = useState<number>(1);
  const [decimals, setDecimals] = useState<number>(4);
  const [countDec, setCountDec] = useState<number>(1);

  // Mode 3: Dice
  const [diceType, setDiceType] = useState<number>(6);
  const [diceCount, setDiceCount] = useState<number>(2);

  // Mode 4: Lottery
  const [lotteryPick, setLotteryPick] = useState<number>(6);
  const [lotteryTotal, setLotteryTotal] = useState<number>(49);

  // Coin flip counts
  const [coinHeads, setCoinHeads] = useState<number>(0);
  const [coinTails, setCoinTails] = useState<number>(0);
  const [lastCoin, setLastCoin] = useState<'Heads' | 'Tails' | null>(null);

  // Results & History
  const [results, setResults] = useState<number[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const [copied, setCopied] = useState<boolean>(false);

  // Secure random integer helper
  const getRandomInt = (min: number, max: number): number => {
    const range = max - min + 1;
    if (range <= 0) return min;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return min + (arr[0] % range);
    }
    return Math.floor(Math.random() * range) + min;
  };

  // Main generator function
  const handleGenerate = () => {
    let newResults: number[] = [];

    if (mode === 'range') {
      const mn = Math.min(minInt, maxInt);
      const mx = Math.max(minInt, maxInt);
      const cnt = Math.max(1, Math.min(countInt, 200));

      if (uniqueInt) {
        const available = mx - mn + 1;
        const target = Math.min(cnt, available);
        const set = new Set<number>();
        while (set.size < target) {
          set.add(getRandomInt(mn, mx));
        }
        newResults = Array.from(set);
      } else {
        for (let i = 0; i < cnt; i++) {
          newResults.push(getRandomInt(mn, mx));
        }
      }
    } else if (mode === 'decimal') {
      const mn = Math.min(minDec, maxDec);
      const mx = Math.max(minDec, maxDec);
      const cnt = Math.max(1, Math.min(countDec, 100));
      const dec = Math.max(0, Math.min(decimals, 10));

      for (let i = 0; i < cnt; i++) {
        const r = Math.random() * (mx - mn) + mn;
        newResults.push(parseFloat(r.toFixed(dec)));
      }
    } else if (mode === 'dice') {
      const cnt = Math.max(1, Math.min(diceCount, 20));
      for (let i = 0; i < cnt; i++) {
        newResults.push(getRandomInt(1, diceType));
      }
    } else if (mode === 'coin') {
      const isHeads = Math.random() < 0.5;
      const resName = isHeads ? 'Heads' : 'Tails';
      setLastCoin(resName);
      if (isHeads) setCoinHeads((h) => h + 1);
      else setCoinTails((t) => t + 1);
      newResults = [isHeads ? 1 : 0];
      setHistory((prev) => [resName, ...prev.slice(0, 9)]);
      return;
    } else if (mode === 'lottery') {
      const pick = Math.max(1, Math.min(lotteryPick, lotteryTotal));
      const set = new Set<number>();
      while (set.size < pick) {
        set.add(getRandomInt(1, lotteryTotal));
      }
      newResults = Array.from(set).sort((a, b) => a - b);
    }

    setResults(newResults);
    setSortOrder('none');

    // Add summary to history
    const summary =
      newResults.length > 5
        ? `[${newResults.slice(0, 5).join(', ')} ... +${newResults.length - 5} more]`
        : `[${newResults.join(', ')}]`;
    setHistory((prev) => [summary, ...prev.slice(0, 9)]);
  };

  // Sort view
  const displayResults = useMemo(() => {
    if (sortOrder === 'asc') return [...results].sort((a, b) => a - b);
    if (sortOrder === 'desc') return [...results].sort((a, b) => b - a);
    return results;
  }, [results, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    if (results.length <= 1) return null;
    const sum = results.reduce((acc, v) => acc + v, 0);
    const avg = (sum / results.length).toFixed(2);
    const min = Math.min(...results);
    const max = Math.max(...results);
    return { sum, avg, min, max, count: results.length };
  }, [results]);

  const handleCopy = async () => {
    if (displayResults.length === 0 && !lastCoin) return;
    const text = mode === 'coin' ? lastCoin! : displayResults.join(', ');
    await copyToClipboard(text);
    setCopied(true);
    toast.success('Results copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mode Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {[
          { id: 'range' as const, label: 'Range / Integers', icon: <Hash size={15} /> },
          { id: 'decimal' as const, label: 'Decimals / Floats', icon: <Sliders size={15} /> },
          { id: 'dice' as const, label: 'Dice Roller', icon: <Dice5 size={15} /> },
          { id: 'coin' as const, label: 'Coin Flip', icon: <Coins size={15} /> },
          { id: 'lottery' as const, label: 'Lottery / Draw', icon: <Trophy size={15} /> },
        ].map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                setResults([]);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--brand)' : 'transparent',
                color: active ? '#ffffff' : 'var(--ink-2)',
                border: 'none',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Parameters & Result Display */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Generator Configuration */}
        <div className="c-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sliders size={16} color="var(--brand-500)" />
            <span>Parameters</span>
          </h3>

          {/* Mode 1: Range / Integers */}
          {mode === 'range' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="c-field">
                  <label className="c-field__label">Minimum Value</label>
                  <input
                    type="number"
                    className="c-field__input"
                    value={minInt}
                    onChange={(e) => setMinInt(Number(e.target.value))}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Maximum Value</label>
                  <input
                    type="number"
                    className="c-field__input"
                    value={maxInt}
                    onChange={(e) => setMaxInt(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="c-field">
                <label className="c-field__label">Number of Items to Generate</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="c-field__input"
                  value={countInt}
                  onChange={(e) => setCountInt(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={uniqueInt}
                  onChange={(e) => setUniqueInt(e.target.checked)}
                />
                <span>Generate unique numbers only (no duplicates)</span>
              </label>
            </div>
          )}

          {/* Mode 2: Decimals */}
          {mode === 'decimal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="c-field">
                  <label className="c-field__label">Minimum</label>
                  <input
                    type="number"
                    step="any"
                    className="c-field__input"
                    value={minDec}
                    onChange={(e) => setMinDec(Number(e.target.value))}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Maximum</label>
                  <input
                    type="number"
                    step="any"
                    className="c-field__input"
                    value={maxDec}
                    onChange={(e) => setMaxDec(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="c-field">
                  <label className="c-field__label">Decimal Precision</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="c-field__input"
                    value={decimals}
                    onChange={(e) => setDecimals(Number(e.target.value))}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Count</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="c-field__input"
                    value={countDec}
                    onChange={(e) => setCountDec(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Dice */}
          {mode === 'dice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="c-field">
                <label className="c-field__label">Dice Polyhedron Type</label>
                <select
                  className="c-select"
                  value={diceType}
                  onChange={(e) => setDiceType(Number(e.target.value))}
                >
                  <option value="4">d4 (4-sided)</option>
                  <option value="6">d6 (Standard 6-sided)</option>
                  <option value="8">d8 (8-sided)</option>
                  <option value="10">d10 (10-sided)</option>
                  <option value="12">d12 (12-sided)</option>
                  <option value="20">d20 (20-sided / RPG)</option>
                  <option value="100">d100 (Percentile)</option>
                </select>
              </div>

              <div className="c-field">
                <label className="c-field__label">Number of Dice to Roll</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="c-field__input"
                  value={diceCount}
                  onChange={(e) => setDiceCount(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
          )}

          {/* Mode 4: Coin Flip */}
          {mode === 'coin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Simulates an unbiased 50/50 fair coin toss using cryptographic randomness.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    background: 'var(--bg-3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Heads</span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)' }}>
                    {coinHeads}
                  </div>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: 'var(--bg-3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Tails</span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)' }}>
                    {coinTails}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode 5: Lottery */}
          {mode === 'lottery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="c-field">
                  <label className="c-field__label">Pick N Numbers</label>
                  <input
                    type="number"
                    min="1"
                    max={lotteryTotal}
                    className="c-field__input"
                    value={lotteryPick}
                    onChange={(e) => setLotteryPick(Number(e.target.value))}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Out of Total</label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    className="c-field__input"
                    value={lotteryTotal}
                    onChange={(e) => setLotteryTotal(Number(e.target.value))}
                  />
                </div>
              </div>
              <span className="c-field__hint">
                Example: Pick 6 from 49 (Classic 6/49 Lottery). All numbers are guaranteed unique.
              </span>
            </div>
          )}

          {/* Single primary button per view */}
          <div style={{ marginTop: 24 }}>
            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerate}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <RotateCw size={18} style={{ marginRight: 8 }} />
              {mode === 'dice'
                ? 'Roll Dice'
                : mode === 'coin'
                ? 'Flip Coin'
                : mode === 'lottery'
                ? 'Draw Lucky Numbers'
                : 'Generate Random Number'}
            </Button>
          </div>
        </div>

        {/* Right Column: Results & Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Result Card */}
          <div className="c-card" style={{ padding: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                Result
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {results.length > 1 && (
                  <button
                    onClick={() =>
                      setSortOrder((curr) =>
                        curr === 'none' ? 'asc' : curr === 'asc' ? 'desc' : 'none'
                      )
                    }
                    className="c-btn c-btn--ghost c-btn--sm"
                    title="Toggle Sort order"
                    style={{ fontSize: 11 }}
                  >
                    <ArrowUpDown size={12} style={{ marginRight: 4 }} />
                    {sortOrder === 'none' ? 'Natural' : sortOrder === 'asc' ? 'Low → High' : 'High → Low'}
                  </button>
                )}
                {(results.length > 0 || lastCoin) && (
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span style={{ marginLeft: 4 }}>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Display box */}
            <div
              style={{
                minHeight: 140,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 10,
                position: 'relative',
              }}
            >
              {mode === 'coin' ? (
                lastCoin ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'var(--brand)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        fontWeight: 800,
                        boxShadow: '0 4px 12px rgba(21, 128, 209, 0.3)',
                      }}
                    >
                      {lastCoin[0]}
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                      {lastCoin}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                    Press &quot;Flip Coin&quot; to begin
                  </span>
                )
              ) : displayResults.length === 1 ? (
                <div
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 48,
                    fontWeight: 800,
                    color: 'var(--brand)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {displayResults[0]}
                </div>
              ) : displayResults.length > 1 ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    maxHeight: 240,
                    overflowY: 'auto',
                    width: '100%',
                    padding: 4,
                  }}
                >
                  {displayResults.map((val, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 42,
                        height: 42,
                        padding: '0 12px',
                        background: 'var(--bg-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--ink)',
                      }}
                    >
                      {val}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  Click generate to produce random results
                </span>
              )}
            </div>

            {/* Set Statistics */}
            {stats && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Count</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {stats.count}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Sum</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {stats.sum}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Average</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {stats.avg}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Min / Max</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {stats.min} / {stats.max}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* History log */}
          {history.length > 0 && (
            <div
              className="c-card"
              style={{
                padding: 16,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  color: 'var(--ink-2)',
                  marginBottom: 10,
                }}
              >
                <History size={14} />
                <span>Recent Generations</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: idx === 0 ? 'var(--ink)' : 'var(--ink-3)',
                      padding: '4px 8px',
                      background: 'var(--bg-3)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
