import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { JsonLd } from '@/components/json-ld';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'vynyl — Listen Together ✦',
  description: 'Listen to music together with your friends in real-time sync. vynyl is a zero-login shared room where friends play music, build a queue, and jam together.',
  metadataBase: new URL('https://vynyl-web.vercel.app'),
  verification: {
    google: 'nhDt8SrBcrYRr1WzbHP29pslhtdp_TfQ8NrLSlsorL0',
  },
  openGraph: {
    title: 'vynyl — Listen Together ✦',
    description: 'Listen to music together with your friends in real-time. Create a room, invite your friends, build a queue, and jam in sync.',
    url: 'https://vynyl-web.vercel.app',
    siteName: 'vynyl',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'vynyl — Listen Together',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'vynyl — Listen Together ✦',
    description: 'Jam with your friends in real-time. Create a room, build a queue, and vibe in sync. No login required.',
    images: ['/api/og'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <JsonLd />
          {children}
          <Toaster />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
