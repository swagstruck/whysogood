import React from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function LogoMark({ size = 28, className, style }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0, borderRadius: 'var(--radius-sm, 6px)', ...style }}
      aria-label="whysogood logo"
    >
      <rect width="32" height="32" rx="6" fill="var(--brand-500, #1580D1)" />
      <g transform="translate(0.3, 1.55) scale(0.08375)" fill="#FFFFFF">
        <path d="M 220 131 L 224 137 L 176 294 L 165 294 L 143 246 L 92 297 L 64 268 L 111 221 L 65 198 L 63 191 Z" />
        <path d="M 127 71 L 174 116 L 164 125 L 118 81 Z" />
        <path d="M 196 48 L 210 48 L 210 114 L 196 114 Z" />
        <path d="M 273 82 L 284 91 L 239 135 L 230 124 Z" />
        <path d="M 250 152 L 312 152 L 312 166 L 250 166 Z" />
        <path d="M 242 181 L 288 226 L 279 236 L 232 191 Z" />
      </g>
    </svg>
  );
}
