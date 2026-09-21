'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Sparkles, ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_DESCRIPTIONS, getToolsByCategory, TOOLS_DEDUPED } from '@/lib/registry';
import { ToolCard } from '@/components/tools/ToolCard';
import type { Category, Tool } from '@/lib/types';

export function CategoryParallelExplorer() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('Images');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stub'>('all');

  // Compute stats per category for the sidebar
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number; stubs: number }> = {};
    let totalAll = 0;
    let activeAll = 0;

    CATEGORIES.forEach(cat => {
      const tools = getToolsByCategory(cat);
      const activeCount = tools.filter(t => t.status === 'active').length;
      stats[cat] = {
        total: tools.length,
        active: activeCount,
        stubs: tools.length - activeCount,
      };
      totalAll += tools.length;
      activeAll += activeCount;
    });

    stats['All'] = {
      total: totalAll,
      active: activeAll,
      stubs: totalAll - activeAll,
    };

    return stats;
  }, []);

  // Filter tools for current selection
  const displayedTools = useMemo(() => {
    let list: Tool[] = [];
    if (selectedCategory === 'All') {
      list = TOOLS_DEDUPED;
    } else {
      list = getToolsByCategory(selectedCategory);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some(k => k.toLowerCase().includes(q))
      );
    }

    // Apply status filter
    if (statusFilter === 'active') {
      list = list.filter(t => t.status === 'active');
    } else if (statusFilter === 'stub') {
      list = list.filter(t => t.status !== 'active');
    }

    return list;
  }, [selectedCategory, searchQuery, statusFilter]);

  const activeTools = useMemo(() => displayedTools.filter(t => t.status === 'active'), [displayedTools]);
  const stubTools   = useMemo(() => displayedTools.filter(t => t.status !== 'active'), [displayedTools]);

  const currentStats = categoryStats[selectedCategory] || { total: 0, active: 0, stubs: 0 };
  const currentDesc = selectedCategory === 'All'
    ? 'Browse all client-side tools across 11 categories. Runs entirely on your device with 0 server uploads.'
    : CATEGORY_DESCRIPTIONS[selectedCategory];

  const catIconName = selectedCategory === 'All' ? 'LayoutGrid' : (CATEGORY_ICONS[selectedCategory] || 'Zap');
  const SelectedIcon = ((Icons as Record<string, unknown>)[catIconName] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

  return (
    <div style={{ width: '100%' }}>
      {/* ── Parallel Layout Container ────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 260px) minmax(0, 1fr)',
        gap: 32,
        alignItems: 'start',
      }}
      className="parallel-explorer-grid"
      >
        {/* ── Left Sidebar: Category Parallel Menu ─────────────────────────── */}
        <aside
          className="c-card parallel-sidebar"
          style={{
            position: 'sticky',
            top: 88,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 'calc(100vh - 110px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '6px 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>
              Categories
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
              {CATEGORIES.length}
            </span>
          </div>

          {/* All Categories Option */}
          <button
            onClick={() => setSelectedCategory('All')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: selectedCategory === 'All' ? 600 : 500,
              cursor: 'pointer',
              border: selectedCategory === 'All' ? '1px solid var(--brand)' : '1px solid transparent',
              background: selectedCategory === 'All' ? 'var(--brand-subtle)' : 'transparent',
              color: selectedCategory === 'All' ? 'var(--brand)' : 'var(--ink-2)',
              transition: 'all var(--transition-fast)',
              textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={e => {
              if (selectedCategory !== 'All') {
                e.currentTarget.style.background = 'var(--bg-2)';
                e.currentTarget.style.color = 'var(--ink)';
              }
            }}
            onMouseLeave={e => {
              if (selectedCategory !== 'All') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--ink-2)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                background: selectedCategory === 'All' ? 'var(--brand-subtle)' : 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: selectedCategory === 'All' ? 'var(--brand)' : 'var(--ink-2)',
              }}>
                <Sparkles size={14} />
              </div>
              <span>All Categories</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{categoryStats['All']?.total}</span>
            </div>
          </button>

          {/* Individual Category Buttons */}
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            const iconName = CATEGORY_ICONS[cat] || 'Zap';
            const IconEl = ((Icons as Record<string, unknown>)[iconName] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
            const stats = categoryStats[cat];

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--border-hover)' : '1px solid transparent',
                  background: isSelected ? 'var(--bg-2)' : 'transparent',
                  color: isSelected ? 'var(--ink)' : 'var(--ink-2)',
                  transition: 'all var(--transition-fast)',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-2)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--ink-2)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    color: isSelected ? 'var(--brand)' : 'var(--ink-2)',
                  }}>
                    <IconEl size={14} />
                  </div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {stats.active > 0 && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--pos)',
                      background: 'var(--pos-subtle)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {stats.active} live
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {stats.total}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── Right Content: Parallel Tools Explorer ───────────────────────── */}
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header Banner for Selected Category */}
          <div className="c-card" style={{
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                  background: 'var(--brand-subtle)',
                  color: 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SelectedIcon size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.625rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 4px', color: 'var(--ink)' }}>
                    {selectedCategory === 'All' ? 'All Web Utilities' : selectedCategory}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
                    {currentDesc}
                  </p>
                </div>
              </div>

              {/* Stat badges */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="c-badge c-badge--pos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                  {currentStats.active} Available Now
                </span>

                {currentStats.stubs > 0 && (
                  <span className="c-badge c-badge--neutral">
                    {currentStats.stubs} Coming Soon
                  </span>
                )}

                {selectedCategory !== 'All' && (
                  <Link
                    href={`/${selectedCategory.toLowerCase()}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, color: 'var(--brand)',
                      textDecoration: 'none', marginLeft: 4,
                    }}
                  >
                    Dedicated page <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>

            {/* Filter Toolbar: Search + Status Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              {/* Search box within category */}
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${selectedCategory === 'All' ? 'all' : selectedCategory.toLowerCase()} tools…`}
                  className="input-base"
                  style={{
                    width: '100%', height: 38, paddingLeft: 36, paddingRight: 12,
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status filter tabs */}
              <div className="tabs-bar">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`tab-item${statusFilter === 'all' ? ' active' : ''}`}
                >
                  All ({displayedTools.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`tab-item${statusFilter === 'active' ? ' active' : ''}`}
                  style={{ color: statusFilter === 'active' ? 'var(--pos)' : undefined }}
                >
                  Live ({activeTools.length})
                </button>
                <button
                  onClick={() => setStatusFilter('stub')}
                  className={`tab-item${statusFilter === 'stub' ? ' active' : ''}`}
                >
                  Coming Soon ({stubTools.length})
                </button>
              </div>
            </div>
          </div>

          {/* ── Segregated Section 1: Available Now (Online) ─────────────────── */}
          {(statusFilter === 'all' || statusFilter === 'active') && activeTools.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pos)', boxShadow: '0 0 8px rgba(34,197,94,0.4)' }} />
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                    Available Now
                  </h4>
                  <span className="c-badge c-badge--pos">
                    {activeTools.length} online
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
              }}>
                {activeTools.map(tool => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          )}

          {/* ── Segregated Section 2: Coming Soon ────────────────────────────── */}
          {(statusFilter === 'all' || statusFilter === 'stub') && stubTools.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: activeTools.length > 0 ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink-3)' }} />
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>
                    Coming Soon
                  </h4>
                  <span className="c-badge c-badge--neutral">
                    {stubTools.length} in roadmap
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 16,
              }}>
                {stubTools.map(tool => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          )}

          {/* Empty Search Result State */}
          {displayedTools.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '64px 20px',
              background: 'var(--bg-1)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-xl)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
                No tools found matching &ldquo;{searchQuery}&rdquo;
              </h4>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 16px' }}>
                Try another keyword or select a different category.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="c-btn c-btn--secondary c-btn--sm"
              >
                Clear filter
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Responsive styling overrides */}
      <style jsx>{`
        @media (max-width: 1023px) {
          .parallel-explorer-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .parallel-sidebar {
            position: static !important;
            max-height: none !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            padding: 10px !important;
            gap: 6px !important;
            white-space: nowrap !important;
          }
        }
      `}</style>
    </div>
  );
}
