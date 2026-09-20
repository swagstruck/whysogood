'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';
import * as Icons from 'lucide-react';
import { getToolsByCategory, CATEGORY_ICONS, CATEGORY_DESCRIPTIONS } from '@/lib/registry';
import type { Category, Tool } from '@/lib/types';

interface Props {
  category: Category;
}

function ToolCard({ tool }: { tool: Tool }) {
  const IconEl = ((Icons as Record<string, unknown>)[tool.icon] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  return (
    <Link href={`/tools/${tool.slug}`} style={{ textDecoration: 'none' }}>
      <div className="card card-hover" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, height: '100%', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconEl size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          {tool.status === 'active' && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-full)', letterSpacing: '0.05em' }}>LIVE</span>
          )}
          {tool.status === 'beta' && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-warning)', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: 'var(--radius-full)', letterSpacing: '0.05em' }}>BETA</span>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>{tool.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tool.description}</div>
        </div>
        {tool.formats?.in?.length ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
            {tool.formats.in.slice(0, 4).map(f => (
              <span key={f} style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-faint)', background: 'var(--color-surface2)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>{f}</span>
            ))}
          </div>
        ) : null}
        {tool.status === 'stub' && <span style={{ fontSize: 11, color: 'var(--color-faint)', marginTop: 'auto' }}>Coming soon</span>}
      </div>
    </Link>
  );
}

export function CategoryPageClient({ category }: Props) {
  const [query, setQuery] = useState('');
  const allTools = getToolsByCategory(category);
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
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-muted)', textDecoration: 'none', marginBottom: 28 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
      >
        <ArrowLeft size={14} /> Back to home
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CatIcon size={26} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: 'var(--color-text)' }}>{category}</h1>
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 15 }}>
            {CATEGORY_DESCRIPTIONS[category]} &bull; {allTools.length} tools
          </p>
        </div>
      </div>

      {/* Search within category */}
      <div style={{ position: 'relative', marginBottom: 32, maxWidth: 440 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-faint)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${category.toLowerCase()} tools…`}
          className="input-base"
          style={{ width: '100%', height: 40, paddingLeft: 38, paddingRight: 12, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Active tools */}
      {active.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
            Available Now
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {active.map(t => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </div>
      )}

      {/* Stub tools */}
      {stubs.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-faint)', display: 'inline-block' }} />
            Coming Soon
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {stubs.map(t => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-faint)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15 }}>No tools found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
