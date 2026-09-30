'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextType>({
  toast: { success: () => {}, error: () => {}, info: () => {} },
});

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle, error: XCircle, info: Info,
};
const COLORS: Record<ToastType, string> = {
  success: 'var(--pos)', error: 'var(--neg)', info: 'var(--brand)',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error:   (msg: string) => addToast('error',   msg),
    info:    (msg: string) => addToast('info',     msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — positioned above FeedbackBubble (bottom: 24 + 52 + 12 = 88) */}
      <div style={{
        position: 'fixed', bottom: 88, right: 24, zIndex: 10000,
        display: 'flex', flexDirection: 'column-reverse', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className="card animate-fade-in" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', minWidth: 260, maxWidth: 360,
              pointerEvents: 'all', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
            }}>
              <Icon size={16} style={{ color: COLORS[t.type], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: 'var(--ink-2)', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext).toast;
}
