'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';
import * as Icons from 'lucide-react';
import { getToolsByCategory, CATEGORY_ICONS, CATEGORY_DESCRIPTIONS, COMING_SOON_CATEGORIES } from '@/lib/registry';
import type { Category } from '@/lib/types';
import { ToolCard } from '@/components/tools/ToolCard';

interface Props {
  category: Category;
}

export function CategoryPageClient({ category }: Props) {
  const [query, setQuery] = useState('');
  const allTools = getToolsByCategory(category);
  const isComingSoon = COMING_SOON_CATEGORIES.includes(category);
  const catIconName = CATEGORY_ICONS[category] || 'Zap';
  const CatIcon = ((Icons as Record<string, unknown>)[catIconName] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

  const filtered = useMemo(() => {
    if (!query.trim()) return allTools;
    const q = query.toLowerCase();
    return allTools.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [query, allTools]);

  const active = filtered.filter(t => t.status === 'active');
  const stubs  = filtered.filter(t => t.status !== 'active');

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 16px 80px' }}>
      {/* Back */}
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none', marginBottom: 28,
        transition: 'color var(--transition-fast)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-2)'}
      >
        <ArrowLeft size={14} /> Back to home
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: 'var(--brand-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CatIcon size={26} style={{ color: 'var(--brand-500)' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>{category}</h1>
            {isComingSoon && (
              <span className="c-badge c-badge--neutral" style={{ fontSize: 11, padding: '2px 8px' }}>
                Coming Soon
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 15 }}>
            {CATEGORY_DESCRIPTIONS[category]} &bull; {allTools.length} tools {isComingSoon ? '(in roadmap)' : ''}
          </p>
        </div>
      </div>

      {/* Coming Soon Notice */}
      {isComingSoon && (
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🚧</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              This category is currently in roadmap
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
              We are rebuilding the functionality and front-end interface. These tools will be available soon.
            </div>
          </div>
        </div>
      )}

      {/* Search within category */}
      <div style={{ position: 'relative', marginBottom: 32, maxWidth: 440 }}>
        <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${category.toLowerCase()} tools…`}
          className="input-base"
          style={{ width: '100%', height: 40, paddingLeft: 42, paddingRight: 16, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Active tools */}
      {active.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pos)', display: 'inline-block' }} />
            Available Now
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {active.map(t => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </div>
      )}

      {/* Stub tools */}
      {stubs.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink-2)', display: 'inline-block' }} />
            Coming Soon
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {stubs.map(t => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15 }}>No tools found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
