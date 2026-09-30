import React from 'react';
import Script from 'next/script';

interface GoogleAdSenseProps {
  /**
   * Google AdSense publisher client ID (e.g., 'ca-pub-1234567890123456').
   * If omitted, falls back to process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID.
   */
  clientId?: string;
}

export function GoogleAdSense({ clientId }: GoogleAdSenseProps) {
  const pId = clientId || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-4317877277908124';

  // Do not load the external AdSense script if client ID is missing or set to placeholder
  if (!pId || pId.includes('XXXXXXXXXXXXXXXX')) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pId}`}
      crossOrigin="anonymous"
    />
  );
}
