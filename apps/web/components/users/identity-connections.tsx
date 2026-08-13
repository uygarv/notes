'use client';

import { Check, Link2 } from 'lucide-react';
import type { IdentityProvider } from '@notes/schemas';
import { apiUrl } from '@/lib/api';
import { useIdentityProviders } from '@/lib/queries';
import { oauthProviders } from '@/lib/oauth-providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function IdentityConnections() {
  const providers = useIdentityProviders();

  return <Card><CardHeader><CardTitle>Connected accounts</CardTitle><CardDescription>Connect a provider to use it for future sign-ins.</CardDescription></CardHeader><CardContent>{providers.isPending && <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}{providers.isError && <p role="alert" className="text-destructive text-sm">Couldn’t load connected accounts. Please refresh and try again.</p>}{providers.data && <div className="divide-y rounded-lg border">{providers.data.map((provider) => <IdentityConnection key={provider.provider} provider={provider} />)}</div>}</CardContent></Card>;
}

function IdentityConnection({ provider }: { provider: IdentityProvider }) {
  const details = oauthProviders[provider.provider];
  const Icon = details.Icon;

  return <div className="flex items-center gap-3 p-3 sm:p-4"><div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg border"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{details.name}</p><p className="text-muted-foreground mt-0.5 text-xs leading-5">{provider.linked ? 'Connected to this account.' : details.description}</p></div>{provider.linked ? <span className="text-emerald-600 inline-flex shrink-0 items-center gap-1.5 text-xs font-medium"><Check className="size-3.5" />Connected</span> : <Button asChild variant="outline" size="sm"><a href={apiUrl(`/auth/${provider.provider}/link`)}><Link2 />Link</a></Button>}</div>;
}
