import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'),
  title: {
    default: 'EduStream - Learn, Grow, Succeed',
    template: '%s | EduStream',
  },
  description: 'EduStream is a premier online learning platform offering expert-led courses, insightful blogs, and a thriving community of learners.',
  keywords: ['online courses', 'e-learning', 'education', 'skills', 'programming', 'development'],
  authors: [{ name: 'EduStream' }],
  creator: 'EduStream',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'EduStream',
    title: 'EduStream - Learn, Grow, Succeed',
    description: 'Premier online learning platform',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduStream',
    description: 'Premier online learning platform',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-screen bg-[#F8FAFC]">
            {children}
          </main>
          <Footer />
          <Toaster
            position="top-right"
            containerClassName="toast-container"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                borderRadius: '10px',
                padding: '12px 16px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
