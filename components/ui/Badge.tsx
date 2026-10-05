'use client';
import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'accent'
  | 'brand'
  | 'success'
  | 'warning'
  | 'error'
  | 'new'
  | 'beta'
  | 'pos'
  | 'neg'
  | 'warn'
  | 'info'
  | 'neutral';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: 'c-badge c-badge--neutral',
  neutral: 'c-badge c-badge--neutral',
  accent:  'c-badge c-badge--brand',
  brand:   'c-badge c-badge--brand',
  success: 'c-badge c-badge--pos',
  pos:     'c-badge c-badge--pos',
  warning: 'c-badge c-badge--warn',
  warn:    'c-badge c-badge--warn',
  beta:    'c-badge c-badge--warn',
  error:   'c-badge c-badge--neg',
  neg:     'c-badge c-badge--neg',
  info:    'c-badge c-badge--info',
  new:     'c-badge c-badge--brand',
};

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ variant = 'default', dot = false, children, className = '', style }: BadgeProps) {
  return (
    <span className={[VARIANT_CLASS[variant] || 'c-badge c-badge--neutral', className].filter(Boolean).join(' ')} style={style}>
      {dot && <span className="c-badge-dot" />}
      {children}
    </span>
  );
}
