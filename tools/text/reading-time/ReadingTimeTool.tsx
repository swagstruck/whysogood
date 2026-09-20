'use client';
import React, { useState } from 'react';
import { Clock, Volume2, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function formatMinutesAndSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.max(1, Math.round(totalSeconds))} sec`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

export default function ReadingTimeTool() {
  const [text, setText] = useState('');

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(w => w.length > 0).length : 0;
  const characters = text.length;

  const slowSeconds = words > 0 ? (words / 130) * 60 : 0;
  const normalSeconds = words > 0 ? (words / 200) * 60 : 0;
  const fastSeconds = words > 0 ? (words / 275) * 60 : 0;
  const speechSeconds = words > 0 ? (words / 140) * 60 : 0;

  const loadSample = () => {
    setText(
      `Speed reading is the process of rapidly recognizing and absorbing phrases or sentences on a page all at once, rather than identifying individual words. Modern readers are confronted with vast quantities of information every day, from documentation and technical articles to emails and literature.\n\nThe average adult reading speed in English is around 200 to 250 words per minute. Skilled readers can reach speeds of 400 to 700 words per minute while maintaining high comprehension levels. Calculating reading time helps writers design better user experiences, structure articles effectively, and respect the audience's time.`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Speed Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 18, borderTop: '3px solid var(--color-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent)', marginBottom: 8 }}>
            <BookOpen size={18} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Average Reading</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)' }}>
            {formatMinutesAndSeconds(normalSeconds)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
            Standard pace (200 WPM)
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderTop: '3px solid var(--color-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', marginBottom: 8 }}>
            <Zap size={18} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Fast Reading</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)' }}>
            {formatMinutesAndSeconds(fastSeconds)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
            Skimming / fast pace (275 WPM)
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderTop: '3px solid var(--color-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-warning)', marginBottom: 8 }}>
            <Clock size={18} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Slow / Careful</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)' }}>
            {formatMinutesAndSeconds(slowSeconds)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
            Detailed study (130 WPM)
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderTop: '3px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3b82f6', marginBottom: 8 }}>
            <Volume2 size={18} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Speaking / Speech</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)' }}>
            {formatMinutesAndSeconds(speechSeconds)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
            Presentation speed (140 WPM)
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>
            {words} words &bull; {characters} characters
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={loadSample}>
              Sample Article
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setText('')} disabled={!text}>
              Clear
            </Button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your article, essay, or speech to estimate exact reading duration..."
          style={{
            width: '100%', minHeight: 320, padding: 18,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontSize: 15,
            resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
          }}
          autoFocus
        />
      </div>
    </div>
  );
}
