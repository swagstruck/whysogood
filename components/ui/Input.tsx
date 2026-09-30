'use client';
import React from 'react';
import { FieldMessage } from './FieldMessage';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function Input({ label, error, hint, prefix, suffix, style, id, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <div style={{ position: 'absolute', left: 14, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {prefix}
          </div>
        )}
        <input
          id={inputId}
          className={`input-base${error ? ' input-base--error' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          style={{
            width: '100%',
            height: 40,
            padding: `0 ${suffix ? 40 : 16}px 0 ${prefix ? 40 : 16}px`,
            fontSize: 14,
            boxSizing: 'border-box',
            ...style,
          }}
          {...props}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: 14, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <FieldMessage variant="error" id={`${inputId}-error`}>
          {error}
        </FieldMessage>
      )}
      {hint && !error && (
        <FieldMessage variant="hint" id={`${inputId}-hint`}>
          {hint}
        </FieldMessage>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, style, id, ...props }: TextareaProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`input-base${error ? ' input-base--error' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: 14,
          borderRadius: 'var(--radius-md)',
          resize: 'vertical',
          minHeight: 120,
          boxSizing: 'border-box',
          lineHeight: 1.6,
          ...style,
        }}
        {...props}
      />
      {error && (
        <FieldMessage variant="error" id={`${inputId}-error`}>
          {error}
        </FieldMessage>
      )}
      {hint && !error && (
        <FieldMessage variant="hint" id={`${inputId}-hint`}>
          {hint}
        </FieldMessage>
      )}
    </div>
  );
}
