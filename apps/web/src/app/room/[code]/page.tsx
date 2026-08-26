import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoomPage } from '@/components/room/room-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  const title = `Join Room ${upperCode} ✦ vynyl`;
  const description = `You're invited to join Room ${upperCode} on vynyl! Listen to music together in real-time sync with no login required.`;
  const ogImageUrl = `/api/og?code=${upperCode}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://vynyl-web.vercel.app/room/${upperCode}`,
      siteName: 'vynyl',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `vynyl — Join Room ${upperCode}`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <Suspense>
      <RoomPage code={code} />
    </Suspense>
  );
}
