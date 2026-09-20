'use client';
import React from 'react';

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'new' | 'beta';

const STYLES: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' },
  accent:  { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid rgba(99,102,241,0.25)' },
  success: { background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid rgba(34,197,94,0.25)' },
  warning: { background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.25)' },
  error:   { background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.25)' },
  new:     { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', border: '1px solid rgba(99,102,241,0.25)' },
  beta:    { background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.25)' },
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ variant = 'default', children, style }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase' as const, lineHeight: 1.5,
      ...STYLES[variant], ...style,
    }}>
      {children}
    </span>
  );
}
