'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { forgotPasswordSchema, resetPasswordSchema } from '@notes/schemas';
import { GalleryVerticalEnd, LoaderCircle } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { formatApiError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion } from 'motion/react';

function AuthPage({ children }: { children: React.ReactNode }) {
  return <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 p-6 md:p-10"><div className="absolute right-4 top-4"><ThemeToggle /></div><motion.div initial={{ opacity: 0, y: 16, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="flex w-full max-w-sm flex-col gap-6"><Link href="/" className="flex items-center gap-2 self-center font-medium"><span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"><GalleryVerticalEnd className="size-4" /></span>Notes</Link>{children}</motion.div></main>;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }

    setPending(true);
    setError('');
    try {
      await unwrap(await api.auth.forgotPassword({ body: validation.data }));
      setSent(true);
    } catch (caught) {
      setError(formatApiError(caught));
    } finally {
      setPending(false);
    }
  }

  return <AuthPage><Card><CardHeader className="text-center"><CardTitle className="text-xl">Reset your password</CardTitle><CardDescription>{sent ? 'If an account uses this email and password authentication, a reset link is on its way.' : 'Enter your email and we’ll send a reset link.'}</CardDescription></CardHeader><CardContent>{sent ? <div className="space-y-4 text-center"><FieldDescription>Check your inbox and spam folder. The link expires after 15 minutes.</FieldDescription><Button asChild className="w-full"><Link href="/login">Back to sign in</Link></Button></div> : <form onSubmit={submit} noValidate><FieldGroup><Field><FieldLabel htmlFor="reset-email">Email</FieldLabel><Input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" aria-invalid={Boolean(error)} />{error && <FieldError>{error}</FieldError>}</Field><Field><Button className="w-full" type="submit" disabled={pending}>{pending && <LoaderCircle className="animate-spin" />}Send reset link</Button><FieldDescription className="text-center">Remembered it? <Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/login">Sign in</Link></FieldDescription></Field></FieldGroup></form>}</CardContent></Card></AuthPage>;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(token ? '' : 'This password reset link is invalid or incomplete.');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = resetPasswordSchema.safeParse({ token, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);
    setError('');
    try {
      await unwrap(await api.auth.resetPassword({ body: validation.data }));
      router.replace('/login?reset=success');
    } catch (caught) {
      setError(formatApiError(caught));
    } finally {
      setPending(false);
    }
  }

  return <AuthPage><Card><CardHeader className="text-center"><CardTitle className="text-xl">Choose a new password</CardTitle><CardDescription>Your new password must contain at least 8 characters.</CardDescription></CardHeader><CardContent><form onSubmit={submit} noValidate><FieldGroup><Field><FieldLabel htmlFor="new-password">New password</FieldLabel><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} /></Field><Field><FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(error)} />{error && <FieldError>{error}</FieldError>}</Field><Field><Button className="w-full" type="submit" disabled={pending || !token}>{pending && <LoaderCircle className="animate-spin" />}Reset password</Button><FieldDescription className="text-center"><Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/forgot-password">Request another link</Link></FieldDescription></Field></FieldGroup></form></CardContent></Card></AuthPage>;
}
