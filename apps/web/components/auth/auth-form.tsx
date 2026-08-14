'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { createUserSchema, loginSchema } from '@notes/schemas';
import { api, apiUrl, ApiError, unwrap } from '@/lib/api';
import { queryKeys, useCurrentUser } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { GalleryVerticalEnd, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { motion } from 'motion/react';
import { getErrorMessage } from '@/lib/strings';
import { oauthProviders } from '@/lib/oauth-providers';
import { formatApiError } from '@/lib/utils';
import { isForgotPasswordEnabled } from '@/lib/features';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(
    getErrorMessage(params.get('error'), 'Unable to sign in.'),
  );
  const [pending, setPending] = useState(false);
  const isSignup = mode === 'signup';
  const GoogleIcon = oauthProviders.google.Icon;
  const GitHubIcon = oauthProviders.github.Icon;

  useEffect(() => {
    if (user.data) router.replace('/');
  }, [router, user.data]);

  if (user.isPending || user.data) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/50">
        <LoaderCircle
          className="text-muted-foreground size-5 animate-spin"
          aria-label="Checking your session"
        />
      </main>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const schema = isSignup ? createUserSchema : loginSchema;
    const validation = schema.safeParse({ email, password });
    if (!validation.success) {
      setFieldErrors(
        Object.fromEntries(
          validation.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }

    setPending(true);
    setError('');
    setFieldErrors({});

    try {
      if (isSignup)
        await unwrap(await api.auth.signUp({ body: validation.data }));
      await unwrap(await api.auth.login({ body: validation.data }));
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.replace(params.get('next') || '/');
    } catch (caught) {
      setError(formatApiError(caught));
      if (caught instanceof ApiError) {
        setFieldErrors(
          Object.fromEntries(
            caught.issues.map((issue) => [issue.path.join('.'), issue.message]),
          ),
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 p-6 md:p-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-sm flex-col gap-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </span>
          Notes
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {isSignup
                ? 'Start a home for your notes.'
                : 'Sign in to continue to your workspace.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} noValidate>
              <FieldGroup>
                <Field className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      window.location.assign(apiUrl('/auth/google'))
                    }
                    disabled={pending}
                  >
                    <GoogleIcon className="size-4" />{' '}
                    {oauthProviders.google.name}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      window.location.assign(apiUrl('/auth/github'))
                    }
                    disabled={pending}
                  >
                    <GitHubIcon className="size-4" />{' '}
                    {oauthProviders.github.name}
                  </Button>
                </Field>
                <FieldSeparator>Or continue with email</FieldSeparator>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? 'email-error' : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <FieldError id="email-error">
                      {fieldErrors.email}
                    </FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={
                      isSignup ? 'new-password' : 'current-password'
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password ? 'password-error' : undefined
                    }
                  />
                  {fieldErrors.password && (
                    <FieldError id="password-error">
                      {fieldErrors.password}
                    </FieldError>
                  )}
                </Field>
                {!isSignup && isForgotPasswordEnabled && (
                  <Link
                    className="-mt-3 text-right text-sm underline-offset-4 hover:underline"
                    href="/forgot-password"
                  >
                    Forgot password?
                  </Link>
                )}
                {error && (
                  <FieldError className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
                    {error}
                  </FieldError>
                )}
                {params.get('reset') === 'success' && (
                  <FieldDescription className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-emerald-700 dark:text-emerald-400">
                    Password updated. Sign in with your new password.
                  </FieldDescription>
                )}
                <Field>
                  <Button className="w-full" type="submit" disabled={pending}>
                    {pending && <LoaderCircle className="animate-spin" />}
                    {isSignup ? 'Create account' : 'Sign in'}
                  </Button>
                  <FieldDescription className="text-center">
                    {isSignup ? 'Already have an account?' : 'New to Notes?'}{' '}
                    <Link
                      className="text-foreground underline underline-offset-4 hover:text-primary"
                      href={isSignup ? '/login' : '/sign-up'}
                    >
                      {isSignup ? 'Sign in' : 'Create an account'}
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center text-xs">
          By continuing, you agree to use Notes responsibly.
        </FieldDescription>
      </motion.div>
    </main>
  );
}
