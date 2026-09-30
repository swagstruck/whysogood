'use client';

import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: { [key: string]: unknown }[];
  }
}

export interface AdBannerProps {
  /**
   * AdSense Ad Slot ID (e.g., '1234567890')
   */
  slot?: string;
  /**
   * Ad format: 'auto', 'fluid', 'rectangle', 'horizontal', 'vertical'
   */
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  /**
   * Whether the ad should be full width responsive
   */
  responsive?: boolean;
  /**
   * Custom style object for the ad container
   */
  style?: React.CSSProperties;
  /**
   * Optional custom CSS class
   */
  className?: string;
  /**
   * Whether to display a subtle 'Advertisement' badge above the ad (Google AdSense policy compliance)
   */
  showLabel?: boolean;
  /**
   * Ad layout for in-article or in-feed ads
   */
  layout?: string;
  /**
   * Layout key for in-feed ads
   */
  layoutKey?: string;
}

export function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  style,
  className = '',
  showLabel = true,
  layout,
  layoutKey,
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const isPushed = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const isConfigured = Boolean(clientId && !clientId.includes('XXXXXXXXXXXXXXXX'));

  useEffect(() => {
    if (!isConfigured) return;
    if (isPushed.current) return;

    // Give DOM a tick to guarantee the ins element is mounted and styled
    const timer = setTimeout(() => {
      try {
        if (
          typeof window !== 'undefined' &&
          adRef.current &&
          !adRef.current.getAttribute('data-adsbygoogle-status')
        ) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          isPushed.current = true;
        }
      } catch (err) {
        console.error('Google AdSense push error:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isConfigured, slot]);

  // If AdSense is not configured, show placeholder in development or return null in production
  if (!isConfigured) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div
          className={`ad-container-dev border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-lg p-4 text-center my-6 flex flex-col items-center justify-center text-xs text-zinc-500 ${className}`}
          style={{ minHeight: '90px', ...style }}
        >
          <div className="font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
            Google AdSense Unit
          </div>
          <div>Slot: {slot || 'Auto / Default'} • Format: {format}</div>
          <div className="text-[10px] text-zinc-400 mt-1">
            Configure NEXT_PUBLIC_ADSENSE_CLIENT_ID in .env.local to activate live ads
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={`ad-banner-container overflow-hidden my-6 text-center ${className}`}
      style={style}
    >
      {showLabel && (
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ink-3, #9ca3af)',
            marginBottom: '4px',
            fontWeight: 500,
          }}
        >
          Advertisement
        </div>
      )}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', ...(style || {}) }}
        data-ad-client={clientId}
        {...(slot ? { 'data-ad-slot': slot } : {})}
        {...(format ? { 'data-ad-format': format } : {})}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
