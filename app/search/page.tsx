'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { searchTools } from '@/lib/search';
import { ToolCard } from '@/components/tools/ToolCard';
import { TOOLS_DEDUPED } from '@/lib/registry';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const results = query.trim() ? searchTools(query, 20) : [];

  useEffect(() => { setQuery(searchParams.get('q') || ''); }, [searchParams]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 16px 80px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 24 }}>
        {query ? `Search results for "${query}"` : 'Search Tools'}
      </h1>
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for tools, formats, or tasks…"
          className="input-base"
          style={{ width: '100%', height: 48, paddingLeft: 46, paddingRight: 16, fontSize: 16, boxSizing: 'border-box' }}
          autoFocus
        />
      </div>
      {query.trim() ? (
        results.length > 0 ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20 }}>{results.length} tool{results.length !== 1 ? 's' : ''} found</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {results.map(r => <ToolCard key={r.tool.slug} tool={r.tool} />)}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-faint)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 16 }}>No tools found for &ldquo;{query}&rdquo;</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Try: compress, format, convert, calculate…</p>
          </div>
        )
      ) : (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-faint)' }}>
          <p style={{ fontSize: 15 }}>Start typing to search {TOOLS_DEDUPED.length}+ tools</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense><SearchContent /></Suspense>;
}
