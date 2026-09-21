'use client';
import React from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import type { Tool } from '@/lib/types';

interface ToolCardProps {
  tool: Tool;
  compact?: boolean;
}

export function ToolCard({ tool, compact = false }: ToolCardProps) {
  const IconEl = ((Icons as Record<string, unknown>)[tool.icon] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link href={`/tools/${tool.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="c-card c-card--hover"
        style={{
          padding: compact ? 14 : 20,
          display: 'flex', flexDirection: 'column', gap: 10,
          height: '100%', cursor: 'pointer',
          boxSizing: 'border-box',
          /* override c-card--hover for more pronounced lift */
          transform: hovered ? 'translateY(-2px)' : 'none',
          borderColor: hovered ? 'var(--border-hover)' : 'var(--border)',
        }}
      >
        {/* Icon + badges row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{
            width: compact ? 32 : 40, height: compact ? 32 : 40,
            borderRadius: 'var(--radius-lg)',
            background: hovered ? 'var(--brand-subtle)' : 'var(--bg-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background var(--transition-base)',
          }}>
            {/* brand-500 for decorative icon per spec */}
            <IconEl size={compact ? 16 : 20} style={{ color: hovered ? 'var(--brand-500)' : 'var(--ink-2)' }} />
          </div>
        </div>

        {/* Name + description */}
        <div>
          <div style={{ fontWeight: 700, fontSize: compact ? 13 : 14, color: 'var(--ink)', marginBottom: 4, lineHeight: 1.3 }}>
            {tool.name}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {tool.description}
          </div>
        </div>

        {/* Format pills */}
        {tool.formats?.in?.length ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
            {tool.formats.in.slice(0, 4).map(f => (
              <span key={f} style={{
                fontSize: 10, fontWeight: 600, color: 'var(--ink-3)',
                background: 'var(--bg-2)', padding: '2px 6px',
                borderRadius: 'var(--radius-sm)', textTransform: 'uppercase',
              }}>{f}</span>
            ))}
            {tool.formats.in.length > 4 && (
              <span style={{ fontSize: 10, color: 'var(--ink-3)', padding: '2px 4px' }}>+{tool.formats.in.length - 4}</span>
            )}
          </div>
        ) : (
          tool.status === 'stub' ? (
            <span style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 'auto' }}>Coming soon</span>
          ) : null
        )}
      </div>
    </Link>
  );
}
