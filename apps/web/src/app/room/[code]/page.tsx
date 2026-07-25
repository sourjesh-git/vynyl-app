import { Suspense } from 'react';
import { RoomPage } from '@/components/room/room-page';

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
