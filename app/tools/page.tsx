'use client';
import React from 'react';
import { CategoryParallelExplorer } from '@/components/tools/CategoryParallelExplorer';

export default function AllToolsPage() {
  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: 'var(--color-text)' }}>
          All Tools
        </h1>
        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 16 }}>
          Explore 120+ client-side web utilities segregated by category. Everything runs locally in your browser.
        </p>
      </div>

      <CategoryParallelExplorer />
    </div>
  );
}
