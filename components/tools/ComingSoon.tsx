'use client';
import React from 'react';
import { Lock, Hammer } from 'lucide-react';

interface ComingSoonProps {
  toolName: string;
  description: string;
}

export function ComingSoon({ toolName, description }: ComingSoonProps) {
  return (
    <div className="c-card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Hammer size={28} style={{ color: 'var(--ink-2)' }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
        {toolName} is on the way
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 24px' }}>
        {description}
      </p>
      <span className="c-badge c-badge--pos" style={{ fontSize: 12, padding: '6px 14px' }}>
        <Lock size={12} style={{ marginRight: 4 }} />
        When ready, all processing will happen in your browser — no uploads
      </span>
    </div>
  );
}
