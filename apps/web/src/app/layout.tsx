import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'vynyl — Listen Together',
  description: 'Listen to music together with your friends. vynyl is a shared listening room where friends can play music together, build a queue, and listen in sync.',
  metadataBase: new URL('https://vynyl-web.vercel.app'),
  openGraph: {
    title: 'vynyl — Listen Together',
    description: 'Listen to music together with your friends in real-time. Create a room, build a queue, and jam in sync.',
    url: 'https://vynyl-web.vercel.app',
    siteName: 'vynyl',
    images: [
      {
        url: '/webpage_hero.png',
        width: 1200,
        height: 630,
        alt: 'vynyl — Shared listening rooms',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'vynyl — Listen Together',
    description: 'Listen to YouTube together with your friends in real-time. Create a room, build a queue, and jam in sync.',
    images: ['/webpage_hero.png'],
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
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
