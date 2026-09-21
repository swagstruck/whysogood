'use client';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { CATEGORIES } from '@/lib/registry';

export function Footer() {
  const categoryGroups = [
    { heading: 'Tools', links: [
      { label: 'Images', href: '/images' },
      { label: 'PDF', href: '/pdf' },
      { label: 'Developer', href: '/developer' },
      { label: 'Data', href: '/data' },
      { label: 'Text', href: '/text' },
    ]},
    { heading: 'More Tools', links: [
      { label: 'Calculators', href: '/calculators' },
      { label: 'Design', href: '/design' },
      { label: 'Generators', href: '/generators' },
      { label: 'Security', href: '/security' },
      { label: 'Files', href: '/files' },
    ]},
    { heading: 'Platform', links: [
      { label: 'All Tools', href: '/tools' },
      { label: 'Search', href: '/search' },
    ]},
  ];

  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-1)',
      padding: '48px 16px 32px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Top */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div style={{ gridColumn: '1 / -1', maxWidth: 300 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 12 }}>
              {/* brand-500 = decorative use for logos/icons per spec */}
              <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={13} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>whysogood</span>
            </Link>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
              100+ free tools that run in your browser. No uploads, no sign‑up, no tracking.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <span className="c-badge c-badge--pos">
                🔒 100% Client-Side &amp; Private
              </span>
            </div>
          </div>

          {/* Category links */}
          {categoryGroups.map(g => (
            <div key={g.heading}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 0 }}>
                {g.heading}
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} style={{
                      fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none',
                      transition: 'color var(--transition-fast)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-2)'}
                    >{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
            &copy; {new Date().getFullYear()} whysogood. No sign‑up needed. No data collected.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
            Everything runs in your browser.
          </p>
        </div>
      </div>
    </footer>
  );
}
