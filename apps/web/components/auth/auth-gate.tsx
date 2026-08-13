'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { queryKeys, useCurrentUser } from '@/lib/queries';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  useEffect(() => {
    if (user.error instanceof ApiError && user.error.status === 401) {
      queryClient.removeQueries({ queryKey: queryKeys.me });
      queryClient.removeQueries({ queryKey: queryKeys.notes });
      queryClient.removeQueries({ queryKey: queryKeys.tags });
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, queryClient, router, user.error]);

  if (user.isPending) return <WorkspaceSkeleton />;
  if (user.error instanceof ApiError && user.error.status === 401) return null;
  if (user.error) return <WorkspaceError onRetry={() => user.refetch()} />;
  return <>{children}</>;
}

function WorkspaceSkeleton() {
  return <main className="flex min-h-screen bg-background"><aside className="hidden w-72 shrink-0 border-r p-3 md:flex md:flex-col"><Skeleton className="h-8 w-24" /><Skeleton className="mt-7 h-9 w-full" /><Skeleton className="mt-6 h-3 w-16" /><Skeleton className="mt-3 h-8 w-full" /><Skeleton className="mt-auto h-10 w-full" /></aside><section className="flex min-w-0 flex-1 flex-col border-r lg:max-w-[22rem]"><header className="space-y-3 border-b p-4"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-12" /></div><Skeleton className="size-8" /></div><Skeleton className="h-9 w-full" /><div className="flex gap-2"><Skeleton className="h-6 w-9" /><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-14" /></div></header><div className="space-y-2 p-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div></section><section className="hidden min-w-0 flex-1 p-8 lg:block"><Skeleton className="h-10 w-2/3 max-w-xl" /><Skeleton className="mt-6 h-11 w-full max-w-2xl" /><div className="mt-8 space-y-3"><Skeleton className="h-5 w-full max-w-3xl" /><Skeleton className="h-5 w-11/12 max-w-3xl" /><Skeleton className="h-5 w-4/5 max-w-3xl" /></div></section></main>;
}

function WorkspaceError({ onRetry }: { onRetry: () => void }) {
  return <main className="grid min-h-screen place-items-center p-6"><div role="alert" className="max-w-sm text-center"><h1 className="text-lg font-semibold">Couldn’t load your workspace</h1><p className="text-muted-foreground mt-2 text-sm">Check your connection and try again.</p><Button className="mt-4" onClick={onRetry}><RefreshCw />Try again</Button></div></main>;
}
