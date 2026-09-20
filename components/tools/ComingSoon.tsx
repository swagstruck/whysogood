'use client';
import React from 'react';
import { Lock, Hammer } from 'lucide-react';

interface ComingSoonProps {
  toolName: string;
  description: string;
}

export function ComingSoon({ toolName, description }: ComingSoonProps) {
  return (
    <div className="card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)', background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Hammer size={28} style={{ color: 'var(--color-muted)' }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
        {toolName} is on the way
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
        {description}
      </p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-success)', background: 'rgba(34,197,94,0.1)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <Lock size={12} />
        When ready, all processing will happen in your browser — no uploads
      </div>
    </div>
  );
}
