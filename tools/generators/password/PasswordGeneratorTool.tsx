'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import { generatePassword, generateMultiplePasswords } from '@/lib/generators/engines';
import { checkPasswordStrength } from '@/lib/security/engines';
import {
  Copy,
  Check,
  RotateCw,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Sparkles,
  Sliders,
  List,
} from 'lucide-react';

export default function PasswordGeneratorTool() {
  const toast = useToast();

  // Generator Options
  const [length, setLength] = useState<number>(16);
  const [uppercase, setUppercase] = useState<boolean>(true);
  const [lowercase, setLowercase] = useState<boolean>(true);
  const [numbers, setNumbers] = useState<boolean>(true);
  const [symbols, setSymbols] = useState<boolean>(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState<boolean>(false);
  const [customSymbols, setCustomSymbols] = useState<string>('');
  const [count, setCount] = useState<number>(1);

  // Seed for explicit regeneration
  const [seed, setSeed] = useState<number>(0);

  // Copy feedback states
  const [copiedMain, setCopiedMain] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Preset quick selections
  const applyPreset = (preset: 'strong' | 'pin' | 'ultra' | 'alphanumeric') => {
    if (preset === 'strong') {
      setLength(16);
      setUppercase(true);
      setLowercase(true);
      setNumbers(true);
      setSymbols(true);
      setExcludeAmbiguous(false);
      setCount(1);
    } else if (preset === 'pin') {
      setLength(6);
      setUppercase(false);
      setLowercase(false);
      setNumbers(true);
      setSymbols(false);
      setExcludeAmbiguous(false);
      setCount(1);
    } else if (preset === 'ultra') {
      setLength(32);
      setUppercase(true);
      setLowercase(true);
      setNumbers(true);
      setSymbols(true);
      setExcludeAmbiguous(true);
      setCount(1);
    } else if (preset === 'alphanumeric') {
      setLength(20);
      setUppercase(true);
      setLowercase(true);
      setNumbers(true);
      setSymbols(false);
      setExcludeAmbiguous(true);
      setCount(1);
    }
    setSeed((s) => s + 1);
  };

  // Generate password(s)
  const passwordList = useMemo(() => {
    // Ensure at least one character set is selected
    const hasAny = uppercase || lowercase || numbers || symbols || customSymbols.length > 0;
    const opts = {
      length,
      uppercase: hasAny ? uppercase : true,
      lowercase,
      numbers,
      symbols,
      excludeAmbiguous,
      customSymbols,
    };

    if (count > 1) {
      return generateMultiplePasswords(opts, count);
    }
    return [generatePassword(opts)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, uppercase, lowercase, numbers, symbols, excludeAmbiguous, customSymbols, count, seed]);

  const primaryPassword = passwordList[0] || '';
  const strength = useMemo(() => {
    if (!primaryPassword) return null;
    return checkPasswordStrength(primaryPassword);
  }, [primaryPassword]);

  const handleRegenerate = () => {
    setSeed((s) => s + 1);
  };

  const handleCopyPrimary = async () => {
    if (!primaryPassword) return;
    await copyToClipboard(primaryPassword);
    setCopiedMain(true);
    toast.success('Password copied to clipboard');
    setTimeout(() => setCopiedMain(false), 2000);
  };

  const handleCopyIndividual = async (pwd: string, index: number) => {
    await copyToClipboard(pwd);
    setCopiedIndex(index);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleCopyAll = async () => {
    const text = passwordList.join('\n');
    await copyToClipboard(text);
    toast.success(`Copied all ${passwordList.length} passwords`);
  };

  const handleDownloadTxt = () => {
    const text = passwordList.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `passwords-${length}chars-${count}qty.txt`);
    toast.success('Downloaded passwords as text file');
  };

  // Color mapping for strength bar
  const strengthColors = ['var(--neg)', 'var(--warn)', '#E8B500', 'var(--brand)', 'var(--pos)'];
  const activeStrengthColor = strength ? strengthColors[strength.score] : 'var(--border)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Presets Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginRight: 4 }}>
          Presets:
        </span>
        <button
          onClick={() => applyPreset('strong')}
          className="c-btn c-btn--ghost c-btn--sm"
          style={{ fontSize: 12 }}
        >
          Standard (16 chars)
        </button>
        <button
          onClick={() => applyPreset('ultra')}
          className="c-btn c-btn--ghost c-btn--sm"
          style={{ fontSize: 12 }}
        >
          High Security (32 chars)
        </button>
        <button
          onClick={() => applyPreset('alphanumeric')}
          className="c-btn c-btn--ghost c-btn--sm"
          style={{ fontSize: 12 }}
        >
          Alphanumeric (No symbols)
        </button>
        <button
          onClick={() => applyPreset('pin')}
          className="c-btn c-btn--ghost c-btn--sm"
          style={{ fontSize: 12 }}
        >
          PIN Code (6 digits)
        </button>
      </div>

      {/* Primary Result Display Card */}
      <div className="c-card" style={{ padding: 24 }}>
        {count === 1 ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                Generated Password
              </span>
              {strength && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="c-badge"
                    style={{
                      background: 'var(--bg-1)',
                      color: activeStrengthColor,
                      borderColor: activeStrengthColor,
                    }}
                  >
                    {strength.label} ({strength.entropy} bits)
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    Crack time: ~{strength.crackTime}
                  </span>
                </div>
              )}
            </div>

            {/* Password String Box */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                minHeight: 64,
                marginBottom: 16,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: length > 36 ? 16 : 22,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  wordBreak: 'break-all',
                  letterSpacing: '0.05em',
                  userSelect: 'all',
                }}
              >
                {primaryPassword}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerate}
                  title="Generate a new password"
                >
                  <RotateCw size={14} style={{ marginRight: 6 }} />
                  Regenerate
                </Button>
                {/* Single Primary Action button per view guideline */}
                <Button variant="primary" size="sm" onClick={handleCopyPrimary}>
                  {copiedMain ? (
                    <Check size={14} style={{ marginRight: 6 }} />
                  ) : (
                    <Copy size={14} style={{ marginRight: 6 }} />
                  )}
                  {copiedMain ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Strength Meter Bar (5 segments) */}
            {strength && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                  {[0, 1, 2, 3, 4].map((step) => {
                    const filled = step <= strength.score;
                    return (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: filled ? activeStrengthColor : 'var(--bg-1)',
                          transition: 'background 0.2s ease',
                        }}
                      />
                    );
                  })}
                </div>
                {strength.suggestions.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    Tip: {strength.suggestions[0]}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Multi-password Batch View */
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <List size={18} color="var(--brand)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  Generated Batch ({passwordList.length} Passwords)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={handleRegenerate}>
                  <RotateCw size={14} style={{ marginRight: 6 }} />
                  Regenerate Batch
                </Button>
                <Button variant="secondary" size="sm" onClick={handleDownloadTxt}>
                  <Download size={14} style={{ marginRight: 6 }} />
                  Download .TXT
                </Button>
                <Button variant="primary" size="sm" onClick={handleCopyAll}>
                  <Copy size={14} style={{ marginRight: 6 }} />
                  Copy All
                </Button>
              </div>
            </div>

            {/* List container */}
            <div
              style={{
                maxHeight: 340,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 4,
              }}
            >
              {passwordList.map((pwd, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {pwd}
                  </span>
                  <button
                    onClick={() => handleCopyIndividual(pwd, idx)}
                    className="c-btn c-btn--ghost c-btn--sm"
                    style={{ marginLeft: 12, flexShrink: 0 }}
                  >
                    {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Controls Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Length & Quantity Card */}
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
            <span>Length & Quantity</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Length slider */}
            <div className="c-field">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label className="c-field__label" style={{ margin: 0 }}>
                  Password Length
                </label>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--brand)',
                  }}
                >
                  {length} characters
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="64"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand)' }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[8, 12, 16, 24, 32, 48].map((val) => (
                  <button
                    key={val}
                    onClick={() => setLength(val)}
                    className="c-btn c-btn--ghost c-btn--sm"
                    style={{
                      padding: '2px 8px',
                      fontSize: 11,
                      background: length === val ? 'var(--brand-subtle, rgba(21, 128, 209, 0.12))' : undefined,
                      color: length === val ? 'var(--brand)' : 'var(--ink-2)',
                    }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity / Count slider */}
            <div className="c-field">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label className="c-field__label" style={{ margin: 0 }}>
                  Number of Passwords
                </label>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--brand)',
                  }}
                >
                  {count} {count === 1 ? 'password' : 'passwords'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand)' }}
              />
            </div>
          </div>
        </div>

        {/* Character Rules Card */}
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
            <KeyRound size={16} color="var(--brand-500)" />
            <span>Character Inclusions</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
              />
              <span>Uppercase Letters (A–Z)</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={lowercase}
                onChange={(e) => setLowercase(e.target.checked)}
              />
              <span>Lowercase Letters (a–z)</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={numbers}
                onChange={(e) => setNumbers(e.target.checked)}
              />
              <span>Numeric Digits (0–9)</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={symbols}
                onChange={(e) => setSymbols(e.target.checked)}
              />
              <span>Symbols (!@#$%^&*)</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'var(--ink-2)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={excludeAmbiguous}
                onChange={(e) => setExcludeAmbiguous(e.target.checked)}
              />
              <span>Exclude Ambiguous Characters (0, O, 1, l, I)</span>
            </label>

            {/* Custom symbols optional field */}
            <div className="c-field" style={{ marginTop: 8 }}>
              <label className="c-field__label">Custom Characters (Optional)</label>
              <input
                type="text"
                className="c-field__input"
                placeholder="e.g. #$%_-"
                value={customSymbols}
                onChange={(e) => setCustomSymbols(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
