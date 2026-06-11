'use client';
import Script from 'next/script';

/**
 * Loads the AdSense tag, which bootstraps Google's TCF-2.2-certified CMP
 * (configured under AdSense → Privacy & messaging → GDPR message).
 * Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT exists.
 */
export const ConsentLoader = () => {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      id="adsense-cmp"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
};
