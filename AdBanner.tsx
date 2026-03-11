'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface AdBannerProps {
  placement: 'homepage_banner' | 'blog_sidebar' | 'article_inline' | 'article_sidebar' | 'blog_header';
  className?: string;
}

// Placements that should NOT show ads
const NO_ADS_PATHS = ['/courses', '/checkout', '/dashboard'];

const AD_FORMATS: Record<AdBannerProps['placement'], { format: string; style: React.CSSProperties }> = {
  homepage_banner: { format: 'horizontal', style: { display: 'block', width: '100%', height: '90px' } },
  blog_sidebar: { format: 'rectangle', style: { display: 'block', width: '300px', height: '250px' } },
  article_inline: { format: 'fluid', style: { display: 'block', textAlign: 'center' } },
  article_sidebar: { format: 'rectangle', style: { display: 'block', width: '300px', height: '600px' } },
  blog_header: { format: 'leaderboard', style: { display: 'block', width: '728px', height: '90px' } },
};

export function AdBanner({ placement, className = '' }: AdBannerProps) {
  const pathname = usePathname();
  const adRef = useRef<HTMLDivElement>(null);
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  // Don't show ads on restricted pages
  const isRestrictedPage = NO_ADS_PATHS.some(p => pathname.startsWith(p));
  if (isRestrictedPage) return null;
  if (!adsenseId) return null;

  const adFormat = AD_FORMATS[placement];

  return (
    <div
      ref={adRef}
      className={`ad-container overflow-hidden text-center ${className}`}
      data-placement={placement}
    >
      <ins
        className="adsbygoogle"
        style={adFormat.style}
        data-ad-client={adsenseId}
        data-ad-format={adFormat.format}
        data-full-width-responsive="true"
      />
      <AdScript />
    </div>
  );
}

function AdScript() {
  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {}
  }, []);
  return null;
}

// Server-side ad placeholder for layout purposes
export function AdPlaceholder({ placement, className = '' }: AdBannerProps) {
  if (process.env.NODE_ENV === 'development') {
    const adFormat = AD_FORMATS[placement];
    return (
      <div
        className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center ${className}`}
        style={adFormat.style}
      >
        <span className="text-gray-400 text-xs">Ad: {placement}</span>
      </div>
    );
  }
  return <AdBanner placement={placement} className={className} />;
}
