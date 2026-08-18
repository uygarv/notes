'use client';

import { FormEvent, Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ImageUp, KeyRound, LoaderCircle, Trash2, UserRound } from 'lucide-react';
import { changePasswordSchema, updateUserSchema } from '@notes/schemas';
import { ApiError } from '@/lib/api';
import { useChangePassword, useCurrentUser, useDeleteProfileImage, useUpdateUser, useUploadProfileImage } from '@/lib/queries';
import { formatApiError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { IdentityConnections } from '@/components/users/identity-connections';
import { getErrorMessage } from '@/lib/strings';
import { UserAvatar } from '@/components/users/user-avatar';
import { ProfileImageCropDialog } from '@/components/users/profile-image-crop-dialog';

export default function SettingsPage() {
  return <Suspense fallback={null}><SettingsContent /></Suspense>;
}

function SettingsContent() {
  const user = useCurrentUser();
  const updateUser = useUpdateUser();
  const uploadProfileImage = useUploadProfileImage();
  const deleteProfileImage = useDeleteProfileImage();
  const params = useSearchParams();
  const imageInput = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(() => user.data?.username ?? '');
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const linkError = getErrorMessage(params.get('link_error'), 'That account could not be linked. Please try again.');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = updateUserSchema.safeParse({ username });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Enter a valid username.'); return; }
    setMessage('');
    try { await updateUser.mutateAsync(parsed.data); setMessage('Profile updated'); } catch (error) { setMessage(formatApiError(error)); }
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('Choose a JPEG, PNG, or WebP image up to 10 MB.');
      return;
    }
    setImageToCrop(file);
  }

  async function uploadImage(file: File) {
    setMessage('');
    setUploadProgress(0);
    try {
      await uploadProfileImage.mutateAsync({ file, onProgress: setUploadProgress });
      setMessage('Profile picture updated');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'Profile image upload failed.' ? error.message : formatApiError(error));
    } finally {
      setUploadProgress(null);
      if (imageInput.current) imageInput.current.value = '';
    }
  }

  async function removeImage() {
    setMessage('');
    try {
      await deleteProfileImage.mutateAsync();
      setMessage('Profile picture removed');
    } catch (error) { setMessage(formatApiError(error)); }
  }

  const success = ['Profile updated', 'Profile picture updated', 'Profile picture removed'].includes(message);
  const imageBusy = uploadProfileImage.isPending || deleteProfileImage.isPending;
  return <><section className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12"><header className="mb-8"><p className="text-sm text-muted-foreground">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Manage your profile and connected accounts.</p></header><div className="grid gap-5">{linkError && <p role="alert" className="text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm">{linkError}</p>}<Card><CardHeader><div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><UserRound className="size-4" /></div><div><CardTitle>Profile</CardTitle><CardDescription className="mt-1">Your email is managed by your sign-in method.</CardDescription></div></div></CardHeader><CardContent><div className="mb-6 flex items-center gap-4"><UserAvatar name={user.data?.username ?? user.data?.email} imageUrl={user.data?.profileImageUrl} className="size-16" fallbackClassName="text-base" /><div className="flex flex-wrap items-center gap-2"><input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0])} /><Button type="button" variant="outline" size="sm" disabled={imageBusy} onClick={() => imageInput.current?.click()}>{uploadProfileImage.isPending ? <LoaderCircle className="animate-spin" /> : <ImageUp />} {uploadProgress === null ? (user.data?.profileImageUrl ? 'Replace picture' : 'Upload picture') : `Uploading ${uploadProgress}%`}</Button>{user.data?.profileImageUrl && <Button type="button" variant="destructive" size="sm" disabled={imageBusy} onClick={() => void removeImage()}>{deleteProfileImage.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}Remove</Button>}<p className="w-full text-xs text-muted-foreground">JPEG, PNG, or WebP · up to 10 MB</p></div></div><form className="max-w-sm" onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor="username">Username</FieldLabel><Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Add a username" /></Field><Field><div className="flex items-center gap-3"><Button type="submit" disabled={updateUser.isPending}>{updateUser.isPending && <LoaderCircle className="animate-spin" />}Save changes</Button>{message && <p role="status" className={`flex items-center gap-1.5 text-sm ${success ? 'text-emerald-600' : 'text-destructive'}`}>{success && <Check className="size-3.5" />}{message}</p>}</div></Field></FieldGroup></form></CardContent></Card><ChangePasswordForm hasPassword={user.data?.hasPassword ?? false} /><IdentityConnections /></div></section><ProfileImageCropDialog file={imageToCrop} onOpenChange={(open) => { if (!open) setImageToCrop(null); }} onConfirm={uploadImage} /></>;
}

function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = changePasswordSchema.safeParse({
      currentPassword: hasPassword ? currentPassword : undefined,
      newPassword,
    });
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    setFieldErrors({});
    setMessage('');
    try {
      await changePassword.mutateAsync(parsed.data);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(hasPassword ? 'Password updated' : 'Password created');
    } catch (error) {
      setMessage(formatApiError(error));
      if (error instanceof ApiError) {
        setFieldErrors(Object.fromEntries(error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      }
    }
  }

  const success = message === 'Password updated' || message === 'Password created';

  return <Card><CardHeader><div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-muted"><KeyRound className="size-4" /></div><div><CardTitle>Password</CardTitle><CardDescription className="mt-1">{hasPassword ? 'Changing your password signs out your other sessions.' : 'Create a password to sign in with email as well as your connected provider.'}</CardDescription></div></div></CardHeader><CardContent><form className="max-w-sm" onSubmit={submit} noValidate><FieldGroup>{hasPassword && <Field><FieldLabel htmlFor="current-password">Current password</FieldLabel><Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.currentPassword)} />{fieldErrors.currentPassword && <FieldError>{fieldErrors.currentPassword}</FieldError>}</Field>}<Field><FieldLabel htmlFor="new-password">{hasPassword ? 'New password' : 'Create a password'}</FieldLabel><Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.newPassword)} />{fieldErrors.newPassword && <FieldError>{fieldErrors.newPassword}</FieldError>}</Field><Field><FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(fieldErrors.confirmPassword)} />{fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}</Field><Field><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={changePassword.isPending}>{changePassword.isPending && <LoaderCircle className="animate-spin" />}{hasPassword ? 'Update password' : 'Create password'}</Button>{message && <p role="status" className={`flex items-center gap-1.5 text-sm ${success ? 'text-emerald-600' : 'text-destructive'}`}>{success && <Check className="size-3.5" />}{message}</p>}</div></Field></FieldGroup></form></CardContent></Card>;
}
