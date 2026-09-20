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

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 13, gap: 6 },
  md: { height: 40, padding: '0 16px', fontSize: 14, gap: 8 },
  lg: { height: 48, padding: '0 24px', fontSize: 15, gap: 10 },
};

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'var(--color-accent)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--color-surface2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
  ghost:     { background: 'transparent', color: 'var(--color-muted)', border: 'none' },
  danger:    { background: 'var(--color-error)', color: '#fff', border: 'none' },
};

const HOVER: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'var(--color-accent-hover)' },
  secondary: { background: 'var(--color-surface3)', borderColor: 'var(--color-border-hover)' },
  ghost:     { background: 'var(--color-surface2)', color: 'var(--color-text)' },
  danger:    { background: '#dc2626' },
};

export function Button({
  variant = 'primary', size = 'md', loading = false,
  icon, children, disabled, style, ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, borderRadius: 'var(--radius-md)', cursor: 'pointer',
    fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
    transition: 'background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
    ...SIZES[size],
    ...VARIANTS[variant],
    ...(hovered && !disabled && !loading ? HOVER[variant] : {}),
    ...(disabled || loading ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
    ...style,
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={baseStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
