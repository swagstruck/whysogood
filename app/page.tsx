'use client';
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, Image as ImageIcon, FileText, Code2, Calculator, AlignLeft, Shield, Wand2, Table, Folder } from 'lucide-react';
import { getPopularTools, CATEGORIES, CATEGORY_ICONS, CATEGORY_DESCRIPTIONS, getToolsByCategory } from '@/lib/registry';
import { searchTools } from '@/lib/search';
import type { Tool } from '@/lib/types';
import { CategoryParallelExplorer } from '@/components/tools/CategoryParallelExplorer';
import * as Icons from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Compress Image', slug: 'image-compressor' },
  { label: 'Compress PDF', slug: 'pdf-compressor' },
  { label: 'Format JSON', slug: 'json-formatter' },
  { label: 'CSV → JSON', slug: 'csv-to-json' },
  { label: 'Word Count', slug: 'word-counter' },
  { label: 'SIP Calculator', slug: 'sip-calculator' },
  { label: 'Base64 Encode', slug: 'base64-encoder' },
  { label: 'Favicon', slug: 'favicon-generator' },
];

const CAT_ICON_MAP: Record<string, React.ElementType> = {
  Image: ImageIcon, FileText, Code2, Calculator, AlignLeft, Shield, Wand2, Table, Folder,
  Palette: Icons.Palette, Music: Icons.Music,
};

function ToolCardSmall({ tool }: { tool: Tool }) {
  const IconEl = ((Icons as Record<string, unknown>)[tool.icon] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  return (
    <Link href={`/tools/${tool.slug}`} style={{ textDecoration: 'none' }}>
      <div className="card card-hover" style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconEl size={20} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>{tool.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tool.description}</div>
        </div>
        {tool.formats?.in?.length ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
            {tool.formats.in.slice(0, 3).map(f => (
              <span key={f} style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-faint)', background: 'var(--color-surface2)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>{f}</span>
            ))}
          </div>
        ) : null}
        {tool.status === 'stub' && (
          <span style={{ fontSize: 10, color: 'var(--color-faint)', marginTop: 'auto' }}>Coming soon</span>
        )}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReturnType<typeof searchTools>>([]);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();
  const popularTools = getPopularTools(9);

  const handleSearch = (q: string) => {
    setQuery(q);
    setResults(q.trim() ? searchTools(q, 8) : []);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const mime = file.type;
    if (mime.startsWith('image/')) router.push('/tools/image-compressor');
    else if (mime === 'application/pdf') router.push('/tools/pdf-compressor');
    else if (mime === 'text/csv' || file.name.endsWith('.csv')) router.push('/tools/csv-to-json');
    else if (mime === 'application/json' || file.name.endsWith('.json')) router.push('/tools/json-formatter');
    else if (mime === 'text/plain') router.push('/tools/word-counter');
    else router.push('/tools');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        outline: dragging ? '3px dashed var(--color-accent)' : 'none',
        outlineOffset: -3,
        transition: 'outline-color 0.15s',
        minHeight: '100%',
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '72px 16px 48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', background: 'var(--color-accent-subtle)', padding: '4px 12px', borderRadius: 'var(--radius-full)', marginBottom: 20 }}>
          🔒 100% free · No sign-up · Runs in your browser
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.15, margin: '0 0 16px', color: 'var(--color-text)' }}>
          100 Tools. Free. Private. Forever.
        </h1>
        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'var(--color-muted)', margin: '0 auto 36px', maxWidth: 560 }}>
          100+ free tools that process everything in your browser. No uploads. No accounts. Just results.
        </p>

        {/* Search box */}
        <div style={{ position: 'relative', maxWidth: 580, margin: '0 auto 24px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
            <input
              value={query}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`); }}
              placeholder="Search tools… compress image, format json, word count…"
              style={{
                width: '100%', height: 56, paddingLeft: 48, paddingRight: 16,
                fontSize: 16, background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', color: 'var(--color-text)',
                fontFamily: 'var(--font-sans)', outline: 'none',
                transition: 'border-color var(--transition-fast)',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {/* Inline search results */}
          {results.length > 0 && (
            <div className="card animate-slide-down" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 6, overflow: 'hidden', textAlign: 'left' }}>
              {results.map(r => (
                <Link key={r.tool.slug} href={`/tools/${r.tool.slug}`} onClick={() => { setQuery(''); setResults([]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', textDecoration: 'none', borderBottom: '1px solid var(--color-border)', transition: 'background var(--transition-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{r.tool.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{r.tool.description}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-faint)', background: 'var(--color-surface2)', padding: '2px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>{r.tool.category}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick action pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 640, margin: '0 auto' }}>
          {QUICK_ACTIONS.map(a => (
            <Link key={a.slug} href={`/tools/${a.slug}`} style={{
              fontSize: 13, fontWeight: 500, padding: '6px 14px',
              borderRadius: 'var(--radius-full)', textDecoration: 'none',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              color: 'var(--color-muted)', transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
            >{a.label}</Link>
          ))}
        </div>

        {dragging && (
          <p style={{ fontSize: 14, color: 'var(--color-accent)', marginTop: 16, fontWeight: 600 }}>
            Drop your file to find the right tool!
          </p>
        )}
      </section>

      {/* ── Categories Parallel Menu & Tools Explorer ───────────── */}
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: '0 16px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em', color: 'var(--color-text)' }}>
            Categories
          </h2>
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 14 }}>
            Browse tools segregated by category with live execution indicators.
          </p>
        </div>
        <CategoryParallelExplorer />
      </section>

      {/* ── Popular Tools ──────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Popular Tools</h2>
          <Link href="/tools" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
            All tools <ArrowRight size={14} />
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {popularTools.map(tool => (
            <ToolCardSmall key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────── */}
      <section style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '64px 16px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>Your data never leaves your device</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 16, lineHeight: 1.6, margin: '0 0 24px' }}>
            Every tool on whysogood processes files and data directly in your browser. Nothing is uploaded, saved, or sent to any server.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['No uploads', 'No sign-up', 'No tracking', 'No cloud', 'Open instantly'].map(t => (
              <span key={t} style={{ fontSize: 13, color: 'var(--color-success)', background: 'var(--color-success-subtle)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>✓ {t}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
