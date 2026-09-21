'use client';
import React from 'react';

export type BadgeVariant = 'default' | 'accent' | 'brand' | 'success' | 'warning' | 'error' | 'new' | 'beta';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: 'c-badge c-badge--neutral',
  accent:  'c-badge c-badge--brand',
  brand:   'c-badge c-badge--brand',
  success: 'c-badge c-badge--pos',
  warning: 'c-badge c-badge--warn',
  error:   'c-badge c-badge--neg',
  new:     'c-badge c-badge--brand',
  beta:    'c-badge c-badge--warn',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ variant = 'default', children, className = '', style }: BadgeProps) {
  return (
    <span className={[VARIANT_CLASS[variant], className].filter(Boolean).join(' ')} style={style}>
      {children}
    </span>
  );
}
