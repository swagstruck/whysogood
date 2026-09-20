'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

const VARIANT_STYLES: Record<ToastVariant, { bar: string; icon: string }> = {
  success: { bar: 'var(--color-success)', icon: '✓' },
  error: { bar: 'var(--color-error)', icon: '✕' },
  info: { bar: 'var(--color-accent)', icon: 'ℹ' },
};

export function Toast({ toast, onRemove }: ToastProps) {
  const { bar, icon } = VARIANT_STYLES[toast.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, onRemove]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    minWidth: '280px',
    maxWidth: '380px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    overflow: 'hidden',
    position: 'relative',
    animation: 'fade-in 0.2s ease both',
  };

  const barStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    background: bar,
    borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
  };

  const iconStyle: React.CSSProperties = {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: bar,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  };

  return (
    <div style={containerStyle} role="alert" aria-live="polite">
      <div style={barStyle} />
      <span style={iconStyle} aria-hidden>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-faint)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 'var(--radius-sm)',
          transition: 'color var(--transition-fast)',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-muted)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-faint)')}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
