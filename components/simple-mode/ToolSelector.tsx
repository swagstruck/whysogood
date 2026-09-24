'use client';
import React, { useState } from 'react';
import { CATEGORIES, getToolsByCategory } from '@/lib/registry';
import type { Category, Tool } from '@/lib/types';
import { isToolExecutable } from '@/lib/simpleMode/runners';
import * as Icons from 'lucide-react';
import { Search } from 'lucide-react';

interface ToolSelectorProps {
  currentCategory: Category;
  selectedToolSlug: string | null;
  onSelectCategory: (category: Category) => void;
  onSelectTool: (tool: Tool) => void;
}

export function ToolSelector({
  currentCategory,
  selectedToolSlug,
  onSelectCategory,
  onSelectTool,
}: ToolSelectorProps) {
  const [filterQuery, setFilterQuery] = useState('');

  // Get all tools for the current category
  const allCategoryTools = getToolsByCategory(currentCategory);

  // Filter tools based on search query
  const filteredTools = filterQuery.trim()
    ? allCategoryTools.filter(
        t =>
          t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.keywords.some(k => k.toLowerCase().includes(filterQuery.toLowerCase()))
      )
    : allCategoryTools;

  // Segregate into active functional tools vs coming soon stubs
  const activeTools = filteredTools.filter(t => isToolExecutable(t.slug));
  const stubTools = filteredTools.filter(t => !isToolExecutable(t.slug));

  return (
    <div style={{ marginTop: 24 }}>
      {/* Category Tabs (Manual Override) */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 16,
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES.map(cat => {
          const isSelected = cat === currentCategory;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className="c-btn"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                background: isSelected ? 'var(--brand)' : 'var(--bg-2)',
                color: isSelected ? '#ffffff' : 'var(--ink-2)',
                border: isSelected ? '1px solid var(--brand)' : '1px solid var(--border)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
                flexShrink: 0,
              }}
            >
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Category Tools Search Filter */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ink-3)',
            pointerEvents: 'none',
          }}
        />
        <input
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          placeholder={`Filter ${currentCategory} tools…`}
          style={{
            width: '100%',
            height: 36,
            paddingLeft: 34,
            paddingRight: 12,
            fontSize: 13,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ink)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Section 1: Active Functional Tools ─────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            Available Now ({activeTools.length})
          </h4>
          <span
            className="c-badge c-badge--pos"
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}
          >
            Functional in Browser
          </span>
        </div>

        {activeTools.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: 10,
            }}
          >
            {activeTools.map(tool => {
              const isSelected = selectedToolSlug === tool.slug;
              const IconEl = (
                (Icons as Record<string, unknown>)[tool.icon] || Icons.Zap
              ) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

              return (
                <button
                  key={tool.slug}
                  onClick={() => onSelectTool(tool)}
                  className="c-card c-card--hover"
                  title={`${tool.name} — ${tool.description}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-1)',
                    border: isSelected ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 48,
                    transition: 'all var(--transition-fast)',
                    boxShadow: isSelected
                      ? '0 0 0 1px var(--brand), 0 2px 8px rgba(96, 96, 232, 0.15)'
                      : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--brand)' : 'var(--bg-2)',
                      color: isSelected ? '#ffffff' : 'var(--brand-500)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <IconEl size={16} />
                  </div>

                  <span
                    style={{
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: 13,
                      color: isSelected ? 'var(--brand)' : 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {tool.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: 20,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-2)',
              color: 'var(--ink-3)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            No active tools match in this category.
          </div>
        )}
      </div>

      {/* ── Section 2: Coming Soon Tools (Visually Segregated) ───────────── */}
      {stubTools.length > 0 && (
        <div style={{ marginTop: 24, opacity: 0.75 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              Coming Soon ({stubTools.length})
            </h4>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--ink-3)',
                background: 'var(--bg-2)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border)',
              }}
            >
              On Roadmap
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: 10,
            }}
          >
            {stubTools.map(tool => {
              const IconEl = (
                (Icons as Record<string, unknown>)[tool.icon] || Icons.Clock
              ) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

              return (
                <div
                  key={tool.slug}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-2)',
                    border: '1px dashed var(--border)',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 48,
                    cursor: 'not-allowed',
                    opacity: 0.65,
                  }}
                  title={`${tool.name} (Coming Soon)`}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-3)',
                      color: 'var(--ink-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconEl size={15} />
                  </div>

                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: 13,
                      color: 'var(--ink-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {tool.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
