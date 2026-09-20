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
    html.classList.remove('light');
  } else if (theme === 'light') {
    html.classList.add('light');
  } else {
    // System
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) html.classList.remove('light');
    else html.classList.add('light');
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [recentTools, setRecentTools] = useState<Tool[]>([]);
  const [theme, setThemeState] = useState<ThemeValue>('dark');

  // Apply theme on mount
  useEffect(() => {
    applyTheme(theme);
    // Listen for system preference changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme('system'); };
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
