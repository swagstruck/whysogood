'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';

type Priority = 'Must have' | 'Could have' | 'Good to have';
type Stage = 'idle' | 'submitting' | 'success' | 'error';

const PRIORITIES: Priority[] = ['Must have', 'Could have', 'Good to have'];

const PRIORITY_COLORS: Record<Priority, string> = {
  'Must have':    'var(--neg)',
  'Could have':   'var(--warn)',
  'Good to have': 'var(--pos)',
};

const PRIORITY_BG: Record<Priority, string> = {
  'Must have':    'var(--neg-subtle)',
  'Could have':   'var(--warn-subtle)',
  'Good to have': 'var(--pos-subtle)',
};

const ENDPOINT = process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT ?? '';

export function FeedbackBubble() {
  const [open, setOpen]         = useState(false);
  const [text, setText]         = useState('');
  const [priority, setPriority] = useState<Priority>('Could have');
  const [stage, setStage]       = useState<Stage>('idle');
  const [dropOpen, setDropOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  // Close panel/dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDropOpen(false);
      }
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // Reset form when panel closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setText('');
        setPriority('Could have');
        setStage('idle');
        setDropOpen(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStage('submitting');

    const payload = {
      url:      typeof window !== 'undefined' ? window.location.href : '',
      priority,
      feedback: text.trim(),
    };

    try {
      if (!ENDPOINT) throw new Error('No endpoint configured');

      await fetch(ENDPOINT, {
        method: 'POST',
        mode:   'no-cors',          // Apps Script cross-origin
        headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(payload),
      });
      // 'no-cors' gives opaque response — treat as success
      setStage('success');
    } catch {
      setStage('error');
    }
  };

  const isSubmitting = stage === 'submitting';
  const canSubmit    = text.trim().length > 0 && !isSubmitting;

  return (
    <>
      {/* ── Floating bubble ─────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close feedback' : 'Give feedback'}
        style={{
          position:       'fixed',
          bottom:          24,
          right:           24,
          zIndex:          9998,
          width:           52,
          height:          52,
          borderRadius:   '50%',
          background:     'var(--brand)',
          border:          'none',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent: 'center',
          boxShadow:       '0 4px 20px rgba(0,0,0,0.35)',
          transition:      'transform 200ms ease, box-shadow 200ms ease, background 200ms ease',
          transform:        open ? 'scale(0.9) rotate(10deg)' : 'scale(1) rotate(0deg)',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand)'; }}
      >
        {open
          ? <X     size={20} color="#fff" strokeWidth={2.5} />
          : <MessageSquare size={20} color="#fff" strokeWidth={2} />
        }
      </button>

      {/* ── Panel ───────────────────────────────────────────── */}
      <div
        ref={panelRef}
        style={{
          position:       'fixed',
          bottom:          88,
          right:           24,
          zIndex:          9997,
          width:          'min(360px, calc(100vw - 32px))',
          borderRadius:   'var(--radius-xl)',
          background:     'var(--bg-1)',
          border:         '1px solid var(--border)',
          boxShadow:      '0 8px 40px rgba(0,0,0,0.5)',
          overflow:       'hidden',
          // Animate in/out
          opacity:          open ? 1 : 0,
          transform:        open ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          pointerEvents:    open ? 'auto' : 'none',
          transition:      'opacity 220ms ease, transform 220ms ease',
          transformOrigin: 'bottom right',
        }}
      >
        {/* Header */}
        <div style={{
          padding:        '16px 20px',
          borderBottom:   '1px solid var(--border)',
          display:        'flex',
          alignItems:     'center',
          gap:             12,
          background:     'var(--bg-2)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--brand-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <MessageSquare size={16} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Share Feedback</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>Your ideas help us improve ✨</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Success state */}
          {stage === 'success' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 12, padding: '24px 0', textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--pos-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={28} style={{ color: 'var(--pos)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>
                  Thank you! 🙌
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  Your feedback has been recorded. We read every single one.
                </div>
              </div>
              <button
                onClick={() => { setStage('idle'); setText(''); setPriority('Could have'); }}
                style={{
                  marginTop: 4, padding: '8px 20px', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)', background: 'var(--bg-2)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)',
                  transition: 'var(--transition-fast)',
                }}
              >
                Send another
              </button>
            </div>
          )}

          {/* Error state */}
          {stage === 'error' && (
            <div style={{
              display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--neg-subtle)', border: '1px solid var(--neg)',
              fontSize: 13, color: 'var(--neg)', alignItems: 'center',
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>Couldn't submit. Please try again.</span>
              <button
                onClick={() => setStage('idle')}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 0 }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Form — shown in idle / error / submitting */}
          {stage !== 'success' && (
            <>
              {/* Priority selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Priority
                </label>
                <div ref={dropRef} style={{ position: 'relative' }}>
                  {/* Trigger */}
                  <button
                    onClick={() => setDropOpen(v => !v)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: PRIORITY_BG[priority],
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      color: PRIORITY_COLORS[priority],
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[priority], flexShrink: 0,
                      }} />
                      {priority}
                    </span>
                    <ChevronDown size={14} style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: '150ms ease' }} />
                  </button>

                  {/* Dropdown */}
                  {dropOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 10,
                    }}>
                      {PRIORITIES.map(p => (
                        <button
                          key={p}
                          onClick={() => { setPriority(p); setDropOpen(false); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', border: 'none',
                            background: p === priority ? PRIORITY_BG[p] : 'transparent',
                            cursor: 'pointer', fontSize: 13, fontWeight: p === priority ? 700 : 500,
                            color: p === priority ? PRIORITY_COLORS[p] : 'var(--ink-2)',
                            transition: 'background 100ms',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => { if (p !== priority) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-3)'; }}
                          onMouseLeave={e => { if (p !== priority) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[p], flexShrink: 0 }} />
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Text area */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your suggestion
                </label>
                <textarea
                  value={text}
                  onChange={e => { setText(e.target.value); if (stage === 'error') setStage('idle'); }}
                  placeholder="What would make this better? A new tool, a feature, a fix…"
                  rows={4}
                  disabled={stage === 'submitting'}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--ink)',
                    fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.6,
                    padding: '10px 14px', resize: 'vertical', minHeight: 90, maxHeight: 200,
                    outline: 'none', transition: 'border-color var(--transition-fast)',
                    opacity: stage === 'submitting' ? 0.6 : 1,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, textAlign: 'right' }}>
                  {text.length} chars
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={{
                  width: '100%', padding: '11px', borderRadius: 'var(--radius-md)',
                  border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: canSubmit ? 'var(--brand)' : 'var(--bg-3)',
                  color: canSubmit ? '#fff' : 'var(--ink-3)',
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 200ms ease, color 200ms ease',
                }}
                onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-hover)'; }}
                onMouseLeave={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand)'; }}
              >
                {stage === 'submitting' ? (
                  <>
                    <div className="animate-spin" style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    }} />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Feedback
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
