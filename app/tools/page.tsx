'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { TOOLS_DEDUPED, CATEGORIES, getToolsByCategory } from '@/lib/registry';
import { ToolCard } from '@/components/tools/ToolCard';
import type { Category } from '@/lib/types';

export default function AllToolsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = useMemo(() => {
    return TOOLS_DEDUPED.filter(tool => {
      const matchesCat = selectedCategory === 'All' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.keywords.some(k => k.toLowerCase().includes(q))
      );
      return matchesCat && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--color-text)' }}>
          All Tools
        </h1>
        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 16 }}>
          Explore 120+ client-side web utilities. Everything runs in your browser without tracking or storage.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-faint)', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter tools by name, task, or keyword..."
            className="input-base"
            style={{ width: '100%', height: 42, paddingLeft: 40, paddingRight: 14, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {(['All', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-border)',
                background: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-surface)',
                color: selectedCategory === cat ? '#fff' : 'var(--color-muted)',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
              }}
            >
              {cat}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
                ({cat === 'All' ? TOOLS_DEDUPED.length : getToolsByCategory(cat).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filteredTools.map(tool => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--color-faint)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 16 }}>No tools found matching your search.</p>
        </div>
      )}
    </div>
  );
}
