'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  Globe2,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Note, NoteVisibility } from '@notes/schemas';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/users/user-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatApiError } from '@/lib/utils';
import {
  useAddCollaborator,
  useCreateShareLink,
  useDeleteCollaborator,
  useDeleteShareLink,
  useSharing,
  useUpdateCollaborator,
  useUsernameSearch,
} from '@/lib/queries';

const expiryOptions = [
  { value: '1h', label: '1 hour', milliseconds: 60 * 60 * 1000 },
  { value: '24h', label: '24 hours', milliseconds: 24 * 60 * 60 * 1000 },
  { value: '7d', label: '7 days', milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: '30 days', milliseconds: 30 * 24 * 60 * 60 * 1000 },
] as const;

type ExpiryOption = (typeof expiryOptions)[number]['value'];

function expiryDate(option: ExpiryOption) {
  return new Date(
    Date.now() +
      expiryOptions.find((item) => item.value === option)!.milliseconds,
  ).toISOString();
}

export function ShareDialog({ note }: { note: Note }) {
  const [open, setOpen] = useState(false);
  const [visibilityOverride, setVisibilityOverride] =
    useState<NoteVisibility | null>(null);
  const [expiry, setExpiry] = useState<ExpiryOption>('7d');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [displayedLink, setDisplayedLink] = useState<string | null>(null);
  const settings = useSharing(open ? note.id : undefined);
  const usernameResults = useUsernameSearch(query, open);
  const createLink = useCreateShareLink(note.id);
  const deleteLink = useDeleteShareLink(note.id);
  const addCollaborator = useAddCollaborator(note.id);
  const updateCollaborator = useUpdateCollaborator(note.id);
  const removeCollaborator = useDeleteCollaborator(note.id);

  const visibility =
    visibilityOverride ?? settings.data?.visibility ?? 'private';

  const searchResults = useMemo(
    () => usernameResults.data ?? [],
    [usernameResults.data],
  );
  const isBusy =
    createLink.isPending || deleteLink.isPending || addCollaborator.isPending;

  async function createOrReplaceLink() {
    setError('');
    try {
      const result = await createLink.mutateAsync({
        visibility,
        ...(visibility === 'private' ? { expiresAt: expiryDate(expiry) } : {}),
      });
      setDisplayedLink(result.link?.url ?? null);
    } catch (caught) {
      setError(formatApiError(caught));
    }
  }

  async function revokeLink() {
    setError('');
    try {
      await deleteLink.mutateAsync();
      setDisplayedLink(null);
      setCopied(false);
    } catch (caught) {
      setError(formatApiError(caught));
    }
  }

  async function addUser(username: string) {
    setError('');
    try {
      await addCollaborator.mutateAsync({ username, role });
      setQuery('');
    } catch (caught) {
      setError(formatApiError(caught));
    }
  }

  async function copyLink() {
    const link = displayedLink ?? settings.data?.link?.url;
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  if (note.isLocked) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Unlock this note before sharing"
      >
        <LockKeyhole />
        Share
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setVisibilityOverride(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UsersRound />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(44rem,calc(100svh-2rem))] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share “{note.title}”</DialogTitle>
          <DialogDescription>
            Choose how this note can be opened and who can make changes.
          </DialogDescription>
        </DialogHeader>
        {settings.isPending ? (
          <div className="space-y-3 py-4">
            <div className="bg-muted h-10 animate-pulse rounded-md" />
            <div className="bg-muted h-24 animate-pulse rounded-md" />
          </div>
        ) : (
          <div className="space-y-6">
            <div
              className="grid grid-cols-2 rounded-lg border bg-muted/30 p-1"
              role="tablist"
              aria-label="Note visibility"
            >
              <button
                type="button"
                role="tab"
                aria-selected={visibility === 'private'}
                onClick={() => setVisibilityOverride('private')}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition ${visibility === 'private' ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LockKeyhole className="size-4" />
                Private
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={visibility === 'public'}
                onClick={() => setVisibilityOverride('public')}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition ${visibility === 'public' ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Globe2 className="size-4" />
                Public
              </button>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Link2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {visibility === 'public'
                      ? 'Public read-only link'
                      : 'Private entry link'}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                    {visibility === 'public'
                      ? 'Anyone with this unlisted link can read the note.'
                      : 'The recipient must sign in and already have access to this note.'}
                  </p>
                </div>
              </div>
              <FieldGroup className="mt-4">
                <AnimatePresence initial={false}>
                  {visibility === 'private' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Field>
                        <FieldLabel htmlFor="share-expiry">
                          Link expires
                        </FieldLabel>
                        <Select
                          value={expiry}
                          onValueChange={(value) =>
                            setExpiry(value as ExpiryOption)
                          }
                        >
                          <SelectTrigger id="share-expiry" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {expiryOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>
                {(displayedLink ?? settings.data?.link?.url) && (
                  <div className="flex gap-2">
                    <Input
                      aria-label="Share link"
                      readOnly
                      value={displayedLink ?? settings.data?.link?.url ?? ''}
                      className="min-w-0 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => void copyLink()}
                      aria-label="Copy share link"
                    >
                      <Clipboard />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => void createOrReplaceLink()}
                    disabled={isBusy}
                  >
                    {createLink.isPending && (
                      <LoaderCircle className="animate-spin" />
                    )}
                    {settings.data?.link ? 'Regenerate link' : 'Create link'}
                  </Button>
                  {settings.data?.link && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void revokeLink()}
                      disabled={isBusy}
                    >
                      <Trash2 />
                      Revoke
                    </Button>
                  )}
                  {copied && (
                    <span
                      role="status"
                      className="flex items-center gap-1.5 text-sm text-emerald-600"
                    >
                      <Check className="size-3.5" />
                      Copied
                    </span>
                  )}
                </div>
                {settings.data?.link && (
                  <FieldDescription>
                    {settings.data.link.expiresAt
                      ? `Expires ${new Date(settings.data.link.expiresAt).toLocaleString()}.`
                      : 'This link has no expiration.'}
                  </FieldDescription>
                )}
              </FieldGroup>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <UserPlus className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">People with access</p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                    Editors work together live. Viewers can only read.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search username"
                  aria-label="Search username"
                />
                <Select
                  value={role}
                  onValueChange={(value) =>
                    setRole(value as 'viewer' | 'editor')
                  }
                >
                  <SelectTrigger className="w-28 shrink-0 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AnimatePresence initial={false}>
                {query.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-2 overflow-hidden rounded-md border"
                  >
                    <div className="max-h-36 overflow-y-auto p-1">
                      {usernameResults.isPending ? (
                        <p className="text-muted-foreground px-2 py-1.5 text-xs">
                          Searching…
                        </p>
                      ) : searchResults.length ? (
                        searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => void addUser(user.username)}
                            className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                          >
                            <UserAvatar
                              name={user.username}
                              imageUrl={user.profileImageUrl}
                              className="size-6"
                            />
                            <span className="truncate">{user.username}</span>
                            <span className="text-muted-foreground ml-auto text-xs capitalize">
                              Add as {role}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="text-muted-foreground px-2 py-1.5 text-xs">
                          No users found.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-3 divide-y rounded-md border">
                {settings.data?.collaborators.length ? (
                  settings.data.collaborators.map((collaborator) => (
                    <div
                      key={collaborator.userId}
                      className="flex items-center gap-3 p-2.5"
                    >
                      <UserAvatar
                        name={collaborator.username}
                        imageUrl={collaborator.profileImageUrl}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {collaborator.username}
                      </span>
                      <Select
                        value={collaborator.role}
                        onValueChange={(value) =>
                          void updateCollaborator.mutateAsync({
                            userId: collaborator.userId,
                            body: { role: value as 'viewer' | 'editor' },
                          })
                        }
                      >
                        <SelectTrigger
                          aria-label={`${collaborator.username}'s role`}
                          className="w-25 capitalize"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          void removeCollaborator.mutateAsync(
                            collaborator.userId,
                          )
                        }
                        aria-label={`Remove ${collaborator.username}'s access`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground px-3 py-4 text-center text-xs">
                    Only you have access right now.
                  </p>
                )}
              </div>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
