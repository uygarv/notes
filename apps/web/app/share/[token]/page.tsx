import type { Metadata } from 'next';
import { ShareReader } from '@/components/notes/share-reader';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareReader token={token} />;
}
