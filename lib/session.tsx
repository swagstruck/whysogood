'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Tool } from './types';

type ThemeValue = 'dark' | 'light' | 'system';

interface SessionContextType {
  recentTools: Tool[];
  addRecentTool: (tool: Tool) => void;
  clearRecent: () => void;
  theme: ThemeValue;
  setTheme: (t: ThemeValue) => void;
}

const THEME_STORAGE_KEY = 'whysogood_theme';

const SessionContext = createContext<SessionContextType>({
  recentTools: [],
  addRecentTool: () => {},
  clearRecent: () => {},
  theme: 'system',
  setTheme: () => {},
});

function applyTheme(theme: ThemeValue) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  if (isDark) {
    html.setAttribute('data-theme', 'dark');
    html.classList.remove('light');
  } else {
    html.setAttribute('data-theme', 'light');
    html.classList.add('light');
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [recentTools, setRecentTools] = useState<Tool[]>([]);
  const [theme, setThemeState] = useState<ThemeValue>('system');

  // Load saved theme from localStorage on mount (defaults to 'system')
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeValue | null;
      if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme('system');
      }
    } catch {
      applyTheme('system');
    }
  }, []);

  // Listen for system OS color scheme changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const addRecentTool = useCallback((tool: Tool) => {
    setRecentTools(prev => {
      const filtered = prev.filter(t => t.slug !== tool.slug);
      return [tool, ...filtered].slice(0, 8);
    });
  }, []);

  const clearRecent = useCallback(() => setRecentTools([]), []);

  const setTheme = useCallback((t: ThemeValue) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch (e) {
      console.error('Failed to save theme in localStorage', e);
    }
  }, []);

  return (
    <SessionContext.Provider value={{ recentTools, addRecentTool, clearRecent, theme, setTheme }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
