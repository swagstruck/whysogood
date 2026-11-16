'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, ShieldAlert, Check, X, Copy, Sparkles, Trash2, Key, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { checkPasswordStrength, PasswordStrengthResult } from '@/lib/security/engines';
import { copyToClipboard } from '@/lib/utils';

export default function PasswordStrengthTool() {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const toast = useToast();

  const strength: PasswordStrengthResult | null = password
    ? checkPasswordStrength(password)
    : null;

  const handleClear = () => {
    setPassword('');
  };

  const loadSample = (val: string) => {
    setPassword(val);
    toast.success('Sample password loaded');
  };

  const handleCopy = () => {
    if (!password) return;
    copyToClipboard(password);
    setCopied(true);
    toast.success('Password copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    switch (score) {
      case 0:
        return 'var(--neg)';
      case 1:
        return '#f97316'; // orange
      case 2:
        return 'var(--warn)';
      case 3:
        return 'var(--brand)';
      case 4:
        return 'var(--pos)';
      default:
        return 'var(--bg-3)';
    }
  };

  const getScoreBadge = (score: number) => {
    switch (score) {
      case 0:
        return <span className="c-badge c-badge--neg"><span className="c-badge-dot" /> Very Weak</span>;
      case 1:
        return <span className="c-badge c-badge--warn"><span className="c-badge-dot" /> Weak</span>;
      case 2:
        return <span className="c-badge c-badge--warn"><span className="c-badge-dot" /> Fair</span>;
      case 3:
        return <span className="c-badge c-badge--brand"><span className="c-badge-dot" /> Strong</span>;
      case 4:
        return <span className="c-badge c-badge--pos"><span className="c-badge-dot" /> Very Strong</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Main Testing Card */}
      <div className="c-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Password Strength & Entropy Analyzer
            </h2>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)', margin: '4px 0 0' }}>
              Evaluate password resilience, information entropy, and brute-force crack time in real-time.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={!password}>
              <Trash2 size={16} /> Clear
            </Button>
          </div>
        </div>

        {/* Input Field with Show/Hide toggle */}
        <div className="c-field">
          <label className="c-field__label">Password to Test</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              className="c-field__input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Type or paste a password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                fontFamily: showPassword ? 'var(--font-mono)' : 'inherit',
                paddingRight: '48px',
                fontSize: 'var(--text-body)'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-2)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Preset Samples */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-3)' }}>Test examples:</span>
          <Button variant="ghost" size="sm" onClick={() => loadSample('password123')}>
            Common (Weak)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => loadSample('BlueSky2024!')}>
            Moderate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => loadSample('k9#mP$91xL@7qZb8')}>
            Strong (16-char)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => loadSample('correct-horse-battery-staple-99!')}>
            Passphrase
          </Button>
        </div>

        {/* Strength Meter & Metric Display */}
        {strength && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {/* 5-segment Progress Bar */}
            <div style={{ display: 'flex', gap: '6px', height: '8px' }}>
              {[0, 1, 2, 3, 4].map((idx) => {
                const isActive = idx <= strength.score;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isActive ? getScoreColor(strength.score) : 'var(--bg-3)',
                      transition: 'background-color 0.2s ease'
                    }}
                  />
                );
              })}
            </div>

            {/* Score header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {getScoreBadge(strength.score)}
                <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 'var(--text-body)' }}>
                  {strength.label}
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--ink-2)' }}>
                Estimated crack time: <strong style={{ color: 'var(--ink)' }}>{strength.crackTime}</strong>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div className="metric-card" style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Length</div>
                <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)' }}>
                  {strength.length} chars
                </div>
              </div>

              <div className="metric-card" style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Entropy</div>
                <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)' }}>
                  {strength.entropy} bits
                </div>
              </div>

              <div className="metric-card" style={{ padding: '12px 16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="metric-label" style={{ fontSize: 'var(--text-caption)', color: 'var(--ink-2)' }}>Brute-force Time</div>
                <div className="metric-value" style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--ink)' }}>
                  {strength.crackTime}
                </div>
              </div>
            </div>

            {/* Character Diversity Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'var(--bg-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                Character Diversity Checklist
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-body-sm)' }}>
                  {strength.length >= 12 ? (
                    <Check size={16} style={{ color: 'var(--pos)' }} />
                  ) : (
                    <X size={16} style={{ color: 'var(--neg)' }} />
                  )}
                  <span style={{ color: strength.length >= 12 ? 'var(--ink)' : 'var(--ink-2)' }}>
                    At least 12 characters ({strength.length})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-body-sm)' }}>
                  {strength.hasLower ? (
                    <Check size={16} style={{ color: 'var(--pos)' }} />
                  ) : (
                    <X size={16} style={{ color: 'var(--neg)' }} />
                  )}
                  <span style={{ color: strength.hasLower ? 'var(--ink)' : 'var(--ink-2)' }}>
                    Lowercase letters (a-z)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-body-sm)' }}>
                  {strength.hasUpper ? (
                    <Check size={16} style={{ color: 'var(--pos)' }} />
                  ) : (
                    <X size={16} style={{ color: 'var(--neg)' }} />
                  )}
                  <span style={{ color: strength.hasUpper ? 'var(--ink)' : 'var(--ink-2)' }}>
                    Uppercase letters (A-Z)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-body-sm)' }}>
                  {strength.hasNumber ? (
                    <Check size={16} style={{ color: 'var(--pos)' }} />
                  ) : (
                    <X size={16} style={{ color: 'var(--neg)' }} />
                  )}
                  <span style={{ color: strength.hasNumber ? 'var(--ink)' : 'var(--ink-2)' }}>
                    Numbers (0-9)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-body-sm)' }}>
                  {strength.hasSymbol ? (
                    <Check size={16} style={{ color: 'var(--pos)' }} />
                  ) : (
                    <X size={16} style={{ color: 'var(--neg)' }} />
                  )}
                  <span style={{ color: strength.hasSymbol ? 'var(--ink)' : 'var(--ink-2)' }}>
                    Symbols / Special chars (!@#$...)
                  </span>
                </div>
              </div>
            </div>

            {/* Suggestions for improvement */}
            {strength.suggestions.length > 0 && (
              <div className="c-alert c-alert--warn">
                <ShieldAlert size={20} />
                <div>
                  <strong>Recommendations to strengthen this password:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                    {strength.suggestions.map((item, idx) => (
                      <li key={idx} style={{ marginTop: '2px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Action Button (Rule 2: strictly max 1 primary button per view) */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            type="button"
            className="c-btn c-btn--primary"
            onClick={handleCopy}
            disabled={!password}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            Copy Password
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="c-alert c-alert--pos">
        <ShieldCheck size={20} />
        <div>
          <strong>Zero Transmission Guarantee:</strong> This tool calculates password strength and entropy entirely within your browser runtime using the Shannon entropy model. Your password is never sent across any network or stored in any database.
        </div>
      </div>
    </div>
  );
}
