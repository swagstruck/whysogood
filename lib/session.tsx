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

const SessionContext = createContext<SessionContextType>({
  recentTools: [],
  addRecentTool: () => {},
  clearRecent: () => {},
  theme: 'dark',
  setTheme: () => {},
});

function applyTheme(theme: ThemeValue) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    html.classList.remove('light');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
    html.classList.add('light');
  } else {
    // System — follow OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      html.setAttribute('data-theme', 'dark');
      html.classList.remove('light');
    } else {
      html.setAttribute('data-theme', 'light');
      html.classList.add('light');
    }
  }
}

const THEME_STORAGE_KEY = 'whysogood_theme';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [recentTools, setRecentTools] = useState<Tool[]>([]);
  const [theme, setThemeState] = useState<ThemeValue>('dark');

  // Load persisted theme on mount and listen for OS system preference changes
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeValue | null;
      if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme('dark');
      }
    } catch {
      applyTheme('dark');
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      try {
        const current = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeValue) || 'dark';
        if (current === 'system') applyTheme('system');
      } catch {
        if (theme === 'system') applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
    } catch {}
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
