'use client';

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
}

const SIZE_WIDTHS: Record<ModalSize, string> = {
  sm: '420px',
  md: '560px',
  lg: '720px',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    animation: 'fade-in 0.15s ease both',
  };

  const dialogStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    width: '100%',
    maxWidth: SIZE_WIDTHS[size],
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slide-down 0.2s ease both',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  };

  const closeStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-faint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    transition: 'color var(--transition-fast), background var(--transition-fast)',
    flexShrink: 0,
  };

  return (
    <div
      style={overlayStyle}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        {title && (
          <div style={headerStyle}>
            <h2
              id="modal-title"
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
            >
              {title}
            </h2>
            <button
              style={closeStyle}
              onClick={onClose}
              aria-label="Close dialog"
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--color-text)';
                e.currentTarget.style.background = 'var(--color-surface2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--color-faint)';
                e.currentTarget.style.background = 'none';
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  );
}
