'use client';
import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { FieldMessage } from './FieldMessage';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  selectSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  prefixIcon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    options,
    selectSize = 'md',
    fullWidth = true,
    prefixIcon,
    className = '',
    style,
    id,
    disabled,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  // Size styling configurations
  const sizeConfig = {
    sm: {
      height: 34,
      fontSize: 12,
      paddingLeft: prefixIcon ? 32 : 12,
      paddingRight: 34,
      borderRadius: 'var(--radius-sm)',
      iconRight: 10,
      iconSize: 13,
    },
    md: {
      height: 42,
      fontSize: 14,
      paddingLeft: prefixIcon ? 38 : 14,
      paddingRight: 38,
      borderRadius: 'var(--radius-md)',
      iconRight: 14,
      iconSize: 15,
    },
    lg: {
      height: 48,
      fontSize: 15,
      paddingLeft: prefixIcon ? 42 : 16,
      paddingRight: 42,
      borderRadius: 'var(--radius-md)',
      iconRight: 16,
      iconSize: 16,
    },
  }[selectSize];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </label>
      )}

      <div
        className={`c-select-wrapper c-select-wrapper--${selectSize} ${error ? 'c-select-wrapper--error' : ''}`}
        style={{
          position: 'relative',
          display: fullWidth ? 'flex' : 'inline-flex',
          alignItems: 'center',
          width: fullWidth ? '100%' : 'auto',
        }}
      >
        {prefixIcon && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              color: 'var(--ink-2)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {prefixIcon}
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`c-select c-select--${selectSize} ${error ? 'c-select--error' : ''} ${className}`}
          style={{
            width: '100%',
            height: sizeConfig.height,
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: sizeConfig.paddingLeft,
            paddingRight: sizeConfig.paddingRight,
            fontSize: sizeConfig.fontSize,
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            color: 'var(--ink)',
            background: 'var(--bg-2)',
            border: `1px solid ${error ? 'var(--neg)' : 'var(--border)'}`,
            borderRadius: sizeConfig.borderRadius,
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            boxSizing: 'border-box',
            transition: 'border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast)',
            ...style,
          }}
          {...props}
        >
          {options
            ? options.map(opt => (
                <option
                  key={String(opt.value)}
                  value={opt.value}
                  disabled={opt.disabled}
                  style={{
                    background: 'var(--bg-1)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {/* Custom styled arrow with balanced padding on right */}
        <div
          className="c-select-icon"
          style={{
            position: 'absolute',
            right: sizeConfig.iconRight,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: disabled ? 'var(--ink-4)' : 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <ChevronDown size={sizeConfig.iconSize} strokeWidth={2.2} />
        </div>
      </div>

      {error && (
        <FieldMessage variant="error" id={`${selectId}-error`}>
          {error}
        </FieldMessage>
      )}

      {hint && !error && (
        <FieldMessage variant="hint" id={`${selectId}-hint`}>
          {hint}
        </FieldMessage>
      )}
    </div>
  );
});

export const Dropdown = Select;
