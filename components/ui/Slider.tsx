'use client';

import React, { useId } from 'react';

interface SliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  suffix?: string;
  disabled?: boolean;
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  showValue = true,
  suffix = '',
  disabled = false,
}: SliderProps) {
  const uid = useId();
  const percentage = ((value - min) / (max - min)) * 100;

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    height: '6px',
    borderRadius: 'var(--radius-full)',
    background: `linear-gradient(to right, var(--color-accent) ${percentage}%, var(--color-surface3) ${percentage}%)`,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    opacity: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    margin: 0,
    // extend hit area
    top: '-8px',
    height: 'calc(100% + 16px)',
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: `${percentage}%`,
    transform: 'translate(-50%, -50%)',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
    border: '2px solid #fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
    transition: 'left var(--transition-fast)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && (
            <label
              htmlFor={uid}
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {label}
            </label>
          )}
          {showValue && (
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-mono)',
                minWidth: '3ch',
                textAlign: 'right',
              }}
            >
              {value}{suffix}
            </span>
          )}
        </div>
      )}
      <div style={{ position: 'relative', padding: '8px 0' }}>
        <div style={trackStyle}>
          <div style={thumbStyle} />
          <input
            id={uid}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={e => onChange(Number(e.target.value))}
            style={inputStyle}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-faint)' }}>{min}{suffix}</span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-faint)' }}>{max}{suffix}</span>
      </div>
    </div>
  );
}
