'use client';
import React from 'react';
import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export type FieldMessageVariant = 'error' | 'hint' | 'success' | 'warning';

interface FieldMessageProps {
  children: React.ReactNode;
  variant?: FieldMessageVariant;
  /** Remove the leading icon */
  noIcon?: boolean;
  className?: string;
  id?: string;
}

const ICONS: Record<FieldMessageVariant, React.ElementType> = {
  error:   AlertCircle,
  hint:    Info,
  success: CheckCircle,
  warning: AlertTriangle,
};

/**
 * Inline field-level message — mirrors shadcn's <FormMessage> pattern.
 * Renders below an input to communicate validation state.
 *
 * Usage:
 *   <FieldMessage variant="error">Width must be between 1 and 16383 px.</FieldMessage>
 *   <FieldMessage variant="hint">Leave blank to keep the original format.</FieldMessage>
 */
export function FieldMessage({
  children,
  variant = 'hint',
  noIcon = false,
  className = '',
  id,
}: FieldMessageProps) {
  const Icon = ICONS[variant];
  return (
    <p id={id} className={`field-message field-message--${variant} ${className}`} role={variant === 'error' ? 'alert' : undefined}>
      {!noIcon && <Icon size={12} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span>{children}</span>
    </p>
  );
}
