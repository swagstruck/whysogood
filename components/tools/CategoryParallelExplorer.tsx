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
        <aside style={{
          position: 'sticky',
          top: 88,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: 'calc(100vh - 110px)',
          overflowY: 'auto',
        }}
        className="parallel-sidebar"
        >
          <div style={{ padding: '6px 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
              Categories
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-faint)', background: 'var(--color-surface2)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
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
              border: selectedCategory === 'All' ? '1px solid var(--color-accent)' : '1px solid transparent',
              background: selectedCategory === 'All' ? 'var(--color-surface2)' : 'transparent',
              color: selectedCategory === 'All' ? 'var(--color-text)' : 'var(--color-muted)',
              transition: 'all var(--transition-fast)',
              textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={e => {
              if (selectedCategory !== 'All') {
                e.currentTarget.style.background = 'var(--color-surface2)';
                e.currentTarget.style.color = 'var(--color-text)';
              }
            }}
            onMouseLeave={e => {
              if (selectedCategory !== 'All') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-muted)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                background: selectedCategory === 'All' ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: selectedCategory === 'All' ? 'var(--color-accent)' : 'var(--color-muted)',
              }}>
                <Sparkles size={14} />
              </div>
              <span>All Categories</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-faint)' }}>{categoryStats['All']?.total}</span>
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
                  border: isSelected ? '1px solid var(--color-border-hover)' : '1px solid transparent',
                  background: isSelected ? 'var(--color-surface2)' : 'transparent',
                  color: isSelected ? 'var(--color-text)' : 'var(--color-muted)',
                  transition: 'all var(--transition-fast)',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--color-surface2)';
                    e.currentTarget.style.color = 'var(--color-text)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-muted)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
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
                      color: 'var(--color-success)',
                      background: 'var(--color-success-subtle)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-full)',
                    }}>
                      {stats.active} live
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--color-faint)' }}>
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
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SelectedIcon size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.625rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 4px', color: 'var(--color-text)' }}>
                    {selectedCategory === 'All' ? 'All Web Utilities' : selectedCategory}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>
                    {currentDesc}
                  </p>
                </div>
              </div>

              {/* Stat badges */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--color-success)',
                  background: 'var(--color-success-subtle)', padding: '4px 10px',
                  borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                  {currentStats.active} Available Now
                </span>

                {currentStats.stubs > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--color-faint)',
                    background: 'var(--color-surface2)', padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                  }}>
                    {currentStats.stubs} Coming Soon
                  </span>
                )}

                {selectedCategory !== 'All' && (
                  <Link
                    href={`/${selectedCategory.toLowerCase()}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, color: 'var(--color-accent)',
                      textDecoration: 'none', marginLeft: 4,
                    }}
                  >
                    Dedicated page <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>

            {/* Filter Toolbar: Search + Status Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
              {/* Search box within category */}
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-faint)', pointerEvents: 'none' }} />
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
              <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface2)', padding: 3, borderRadius: 'var(--radius-md)' }}>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: statusFilter === 'all' ? 'var(--color-surface)' : 'transparent',
                    color: statusFilter === 'all' ? 'var(--color-text)' : 'var(--color-muted)',
                    boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  All ({displayedTools.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: statusFilter === 'active' ? 'var(--color-surface)' : 'transparent',
                    color: statusFilter === 'active' ? 'var(--color-success)' : 'var(--color-muted)',
                    boxShadow: statusFilter === 'active' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  Live ({activeTools.length})
                </button>
                <button
                  onClick={() => setStatusFilter('stub')}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: statusFilter === 'stub' ? 'var(--color-surface)' : 'transparent',
                    color: statusFilter === 'stub' ? 'var(--color-text)' : 'var(--color-muted)',
                    boxShadow: statusFilter === 'stub' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
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
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 8px rgba(34,197,94,0.4)' }} />
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                    Available Now
                  </h4>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)', background: 'var(--color-success-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
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
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-faint)' }} />
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--color-muted)', letterSpacing: '-0.01em' }}>
                    Coming Soon
                  </h4>
                  <span style={{ fontSize: 12, color: 'var(--color-faint)', background: 'var(--color-surface2)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
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
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-xl)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
                No tools found matching &ldquo;{searchQuery}&rdquo;
              </h4>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '0 0 16px' }}>
                Try another keyword or select a different category.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="btn-secondary"
                style={{ height: 34, padding: '0 14px', fontSize: 13, borderRadius: 'var(--radius-md)' }}
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
