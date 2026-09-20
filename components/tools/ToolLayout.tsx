'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { Tool } from '@/lib/types';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { RelatedTools } from './RelatedTools';
import { useSession } from '@/lib/session';
import { CATEGORY_ICONS } from '@/lib/registry';
import * as Icons from 'lucide-react';

interface ToolLayoutProps {
  tool: Tool;
  children: React.ReactNode;
}

export function ToolLayout({ tool, children }: ToolLayoutProps) {
  const { addRecentTool } = useSession();

  useEffect(() => {
    addRecentTool(tool);
  }, [tool.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const catPath = tool.category.toLowerCase();
  const catIconName = CATEGORY_ICONS[tool.category] || 'Zap';
  const CatIcon = ((Icons as Record<string, unknown>)[catIconName] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  const ToolIcon = ((Icons as Record<string, unknown>)[tool.icon] || Icons.Zap) as React.ComponentType<{ size?: number; style?: React.CSSProperties }>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px 80px' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontSize: 13, color: 'var(--color-muted)' }}>
        <Link href="/" style={{ color: 'var(--color-muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
        >Home</Link>
        <ChevronRight size={12} style={{ color: 'var(--color-faint)' }} />
        <Link href={`/${catPath}`} style={{ color: 'var(--color-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
        >
          <CatIcon size={12} /> {tool.category}
        </Link>
        <ChevronRight size={12} style={{ color: 'var(--color-faint)' }} />
        <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{tool.name}</span>
      </nav>

      {/* Tool header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ToolIcon size={26} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'clamp(1.375rem, 4vw, 1.875rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: 'var(--color-text)', lineHeight: 1.2 }}>
            {tool.name}
          </h1>
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 15, lineHeight: 1.5 }}>{tool.description}</p>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <PrivacyBadge />
      </div>

      {/* Tool UI */}
      <div>{children}</div>

      {/* Related tools */}
      {tool.related.length > 0 && (
        <div style={{ marginTop: 60, paddingTop: 40, borderTop: '1px solid var(--color-border)' }}>
          <RelatedTools slugs={tool.related} />
        </div>
      )}
    </div>
  );
}
