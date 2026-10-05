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

export function Input({ label, error, hint, prefix, suffix, style, id, className = '', ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={`c-field${error ? ' c-field--error' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="c-field__label"
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <div style={{ position: 'absolute', left: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {prefix}
          </div>
        )}
        <input
          id={inputId}
          className={`c-field__input input-base${error ? ' input-base--error' : ''} ${className}`.trim()}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          style={{
            paddingLeft: prefix ? 36 : 12,
            paddingRight: suffix ? 36 : 12,
            ...style,
          }}
          {...props}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
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

export function Textarea({ label, error, hint, style, id, className = '', ...props }: TextareaProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={`c-field${error ? ' c-field--error' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="c-field__label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`c-textarea input-base${error ? ' input-base--error' : ''} ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        style={{
          minHeight: 120,
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
