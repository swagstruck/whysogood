'use client';
import React from 'react';
import { FieldMessage } from './FieldMessage';

type TextareaProps = {
  label?: string;
  error?: string;
  hint?: string;
  rows?: number;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, error, hint, rows = 4, id, className, style, ...rest }: TextareaProps) {
  const textareaId = id ?? (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={textareaId} style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-muted)', fontFamily: 'var(--font-sans)' }}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        style={{
          padding: '10px 12px',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          resize: 'vertical',
          width: '100%',
          minHeight: '80px',
          boxSizing: 'border-box',
          ...style,
        }}
        className={['input-base', error ? 'input-base--error' : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        {...rest}
      />
      {error && <FieldMessage variant="error" id={`${textareaId}-error`}>{error}</FieldMessage>}
      {hint && !error && <FieldMessage variant="hint" id={`${textareaId}-hint`}>{hint}</FieldMessage>}
    </div>
  );
}
