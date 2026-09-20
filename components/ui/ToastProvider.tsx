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
  success: 'var(--color-success)', error: 'var(--color-error)', info: 'var(--color-accent)',
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
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className="card animate-fade-in" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', minWidth: 260, maxWidth: 360,
              pointerEvents: 'all', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}>
              <Icon size={16} style={{ color: COLORS[t.type], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>{t.message}</span>
              <button onClick={() => remove(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-faint)', padding: 2, display: 'flex', alignItems: 'center' }}>
                <X size={13} />
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
