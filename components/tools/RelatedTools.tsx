'use client';
import React from 'react';
import { TOOL_MAP } from '@/lib/registry';
import { ToolCard } from './ToolCard';

interface RelatedToolsProps {
  slugs: string[];
  title?: string;
}

export function RelatedTools({ slugs, title = 'You may also need' }: RelatedToolsProps) {
  const tools = slugs.map(s => TOOL_MAP[s]).filter(Boolean);
  if (!tools.length) return null;
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, marginTop: 0 }}>
        {title}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {tools.slice(0, 4).map(tool => (
          <ToolCard key={tool.slug} tool={tool} compact />
        ))}
      </div>
    </div>
  );
}
