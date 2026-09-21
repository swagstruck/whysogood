'use client';
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading = false,
  icon, children, disabled, className = '', style, ...props
}: ButtonProps) {
  const cls = [
    'c-btn',
    `c-btn--${variant}`,
    `c-btn--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cls}
      style={style}
    >
      {loading ? (
        <svg style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.75 }} />
        </svg>
      ) : icon ? (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
