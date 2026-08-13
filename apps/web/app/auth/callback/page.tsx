'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { useCurrentUser } from '@/lib/queries';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const user = useCurrentUser();

  useEffect(() => {
    if (user.data) router.replace('/');
    if (user.error) router.replace('/login?error=oauth_failed');
  }, [router, user.data, user.error]);

  return <main className="grid min-h-screen place-items-center bg-zinc-50 dark:bg-zinc-950"><div className="flex items-center gap-3 text-sm text-zinc-500"><LoaderCircle className="size-4 animate-spin" />Finishing your sign-in…</div></main>;
}
