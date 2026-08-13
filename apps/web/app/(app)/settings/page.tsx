'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, LoaderCircle, UserRound } from 'lucide-react';
import { updateUserSchema } from '@notes/schemas';
import { useCurrentUser, useUpdateUser } from '@/lib/queries';
import { formatApiError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { IdentityConnections } from '@/components/users/identity-connections';
import { getErrorMessage } from '@/lib/strings';

export default function SettingsPage() {
  return <Suspense fallback={null}><SettingsContent /></Suspense>;
}

function SettingsContent() {
  const user = useCurrentUser();
  const updateUser = useUpdateUser();
  const params = useSearchParams();
  const [username, setUsername] = useState(() => user.data?.username ?? '');
  const [message, setMessage] = useState('');
  const linkError = getErrorMessage(params.get('link_error'), 'That account could not be linked. Please try again.');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = updateUserSchema.safeParse({ username });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Enter a valid username.'); return; }
    setMessage('');
    try { await updateUser.mutateAsync(parsed.data); setMessage('Profile updated'); } catch (error) { setMessage(formatApiError(error)); }
  }

  return <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12"><header className="mb-8"><p className="text-sm text-muted-foreground">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Manage your profile and connected accounts.</p></header><div className="grid gap-5">{linkError && <p role="alert" className="text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm">{linkError}</p>}<Card><CardHeader><div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><UserRound className="size-4" /></div><div><CardTitle>Profile</CardTitle><CardDescription className="mt-1">Your email is managed by your sign-in method.</CardDescription></div></div></CardHeader><CardContent><form className="max-w-sm" onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor="username">Username</FieldLabel><Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Add a username" /></Field><Field><div className="flex items-center gap-3"><Button type="submit" disabled={updateUser.isPending}>{updateUser.isPending && <LoaderCircle className="animate-spin" />}Save changes</Button>{message && <p role="status" className={`flex items-center gap-1.5 text-sm ${message === 'Profile updated' ? 'text-emerald-600' : 'text-destructive'}`}>{message === 'Profile updated' && <Check className="size-3.5" />}{message}</p>}</div></Field></FieldGroup></form></CardContent></Card><IdentityConnections /></div></section>;
}
