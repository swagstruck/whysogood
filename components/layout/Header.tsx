'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, Zap } from 'lucide-react';
import { useSession } from '@/lib/session';
import { searchTools } from '@/lib/search';
import { CATEGORIES } from '@/lib/registry';
import type { SearchResult } from '@/lib/search';

export function Header() {
  const { theme, setTheme } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Global '/' shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setResults(searchTools(query, 6));
    setFocusedIdx(-1);
  }, [query]);

  const nextTheme = () => {
    const cycle: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const idx = cycle.indexOf(theme);
    setTheme(cycle[(idx + 1) % 3]);
  };
  const themeLabel = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻';

  const goTo = (slug: string) => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    router.push(`/tools/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Enter' && focusedIdx >= 0) goTo(results[focusedIdx].tool.slug);
    if (e.key === 'Enter' && focusedIdx < 0 && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  return (
    <>
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-1)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Logo — brand-500 is decorative per spec */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              whysogood
            </span>
          </Link>

          {/* Desktop search bar */}
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{
              flex: 1, maxWidth: 520, height: 38,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
              cursor: 'text', color: 'var(--ink-3)', fontSize: 14,
              transition: 'border-color var(--transition-fast)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <Search size={15} />
            <span>Search tools&hellip;</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>/</span>
          </button>

          {/* Desktop nav links */}
          <nav style={{ display: 'flex', gap: 4, marginLeft: 4 }} className="desktop-nav">
            {(['Images','PDF','Developer','Data','Calculators'] as const).map(cat => (
              <Link key={cat} href={`/${cat.toLowerCase()}`} style={{
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
                textDecoration: 'none', transition: 'color var(--transition-fast), background var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.background = 'transparent'; }}
              >
                {cat}
              </Link>
            ))}
          </nav>

          {/* Theme toggle */}
          <button
            onClick={nextTheme}
            title={`Current theme: ${theme}. Click to cycle.`}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background var(--transition-fast)',
              flexShrink: 0,
            }}
          >
            {themeLabel}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'var(--ink)',
            }}
            className="mobile-ham"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ── Mobile nav drawer ──────────────────────────────────────── */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0, zIndex: 99,
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <button
            onClick={() => { setMobileOpen(false); setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', cursor: 'text',
              color: 'var(--ink-3)', fontSize: 14, width: '100%',
            }}
          >
            <Search size={15} /> Search tools&hellip;
          </button>
          {CATEGORIES.map(cat => (
            <Link key={cat} href={`/${cat.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                fontSize: 14, fontWeight: 500, color: 'var(--ink-2)',
                textDecoration: 'none', display: 'block',
              }}
            >{cat}</Link>
          ))}
        </div>
      )}

      {/* ── Search overlay ─────────────────────────────────────────── */}
      {searchOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
        >
          <div
            style={{
              position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: 560, padding: '0 16px',
            }}
            onClick={e => e.stopPropagation()}
            className="animate-slide-down"
          >
            <div className="c-card" style={{ overflow: 'hidden' }}>
              {/* Search input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: results.length ? '1px solid var(--border)' : 'none' }}>
                <Search size={18} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search tools… (e.g. compress image, json format)"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'var(--ink)', fontSize: 16, fontFamily: 'var(--font-sans)',
                  }}
                  autoFocus
                />
                <kbd style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>Esc</kbd>
              </div>

              {/* Results */}
              {results.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0' }}>
                  {results.map((r, i) => (
                    <li key={r.tool.slug}>
                      <button
                        onClick={() => goTo(r.tool.slug)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 16px', background: focusedIdx === i ? 'var(--bg-2)' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          transition: 'background var(--transition-fast)',
                          color: 'var(--ink)',
                        }}
                        onMouseEnter={() => setFocusedIdx(i)}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--brand-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Search size={16} style={{ color: 'var(--brand)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.tool.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tool.description}</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>{r.tool.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {query.trim() && results.length === 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                  No tools found for &ldquo;{query}&rdquo;
                </div>
              )}

              {!query && (
                <div style={{ padding: '12px 16px', color: 'var(--ink-3)', fontSize: 12 }}>
                  Try: compress image, format json, word count, sip calculator…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-ham { display: flex !important; }
        }
      `}</style>
    </>
  );
}
