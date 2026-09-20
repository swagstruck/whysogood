'use client';
import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

export function PrivacyBadge() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          color: 'var(--color-success)', borderRadius: 'var(--radius-full)',
          padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
      >
        <Lock size={12} />
        Runs entirely in your browser
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card animate-fade-in"
            style={{ maxWidth: 480, width: '100%', padding: 28 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={20} style={{ color: 'var(--color-success)' }} />
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Your Privacy</h2>
              </div>
              <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-faint)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
              This tool runs <strong style={{ color: 'var(--color-text)' }}>entirely in your browser</strong>. Your files and any input you provide are never uploaded, saved, or sent to any server.
            </p>
            <ul style={{ paddingLeft: 20, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'No files are uploaded anywhere',
                'No data is saved after you leave or refresh the page',
                'No account or sign-up required',
                'No analytics receive your file contents or input',
                'Results exist only in your browser memory until you download them',
              ].map(item => (
                <li key={item} style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--color-success)', marginRight: 8 }}>✓</span>{item}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: 'var(--color-faint)', margin: 0 }}>
              whysogood has no backend. Every tool uses browser APIs: Canvas, Web Audio, File API, WebAssembly, etc.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
