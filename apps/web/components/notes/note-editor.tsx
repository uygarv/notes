'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LockKeyholeOpen,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useQueryClient } from '@tanstack/react-query';
import type { Note, Tag as NoteTag } from '@notes/schemas';
import { createNoteSchema, createTagSchema } from '@notes/schemas';
import {
  useCreateNote,
  useCreateTag,
  useLockNote,
  useTags,
  useUnlockNote,
  useUpdateNote,
  useCurrentUser,
  queryKeys,
} from '@/lib/queries';
import { useUiStore } from '@/lib/store';
import { formatApiError, toPlainText } from '@/lib/utils';
import { decryptNoteContent, encryptNoteContent } from '@/lib/note-crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/notes/rich-text-editor';
import { ShareDialog } from '@/components/notes/share-dialog';
import {
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar';
import { UserAvatar } from '@/components/users/user-avatar';

type EditorProps = {
  note: Note | null;
  onDelete: (note: Note) => void;
  onBack: () => void;
  onCreated: (note: Note) => void;
};

type NoteFields = {
  title: string;
  content: string;
  tags: number[];
};

const editorTransition = { duration: 0.14, ease: [0.22, 1, 0.36, 1] } as const;
const collaboratorNamesStorageKey = 'notes:show-collaborator-names';

function persistedTitle(title: string) {
  return title.trim() || 'Untitled note';
}

function collaboratorColor(userId: number) {
  const hue = ((userId * 137.508) % 360) / 360;
  const saturation = 0.72;
  const lightness = 0.45;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = (hue * 6) % 2;
  const match = chroma * (1 - Math.abs(segment - 1));
  const [red, green, blue] = [
    [chroma, match, 0],
    [match, chroma, 0],
    [0, chroma, match],
    [0, match, chroma],
    [match, 0, chroma],
    [chroma, 0, match],
  ][Math.floor(hue * 6)];
  const offset = lightness - chroma / 2;
  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function NoteEditor({ note, onDelete, onBack, onCreated }: EditorProps) {
  const draft = useUiStore((state) => state.draft);
  const updateDraft = useUiStore((state) => state.updateDraft);
  const clearDraft = useUiStore((state) => state.clearDraft);
  const selectNote = useUiStore((state) => state.selectNote);
  const queryClient = useQueryClient();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const lockNote = useLockNote();
  const unlockNote = useUnlockNote();
  const currentUser = useCurrentUser();
  const tags = useTags();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(
    note?.isLocked ? '' : (note?.content ?? ''),
  );
  const [tagIds, setTagIds] = useState<number[]>(
    note?.tags.map((tag) => tag.id) ?? [],
  );
  const [dirty, setDirty] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(!note?.isLocked);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [lockFormOpen, setLockFormOpen] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [activeEditors, setActiveEditors] = useState<
    { id: number; name: string; profileImageUrl?: string | null }[]
  >([]);
  const presenceClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCollaboratorNames, setShowCollaboratorNames] = useState(true);
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const noteId = note?.id;
  const isOwner = !note || note.access.role === 'owner';
  const isReadOnly = Boolean(note && note.access.role === 'viewer');
  const isLiveCollaborative = Boolean(
    note?.access.isCollaborative && !isReadOnly && currentUser.data,
  );
  const hasActiveCollaboration =
    isLiveSessionActive && activeEditors.length > 0;
  const connectedEditors = useMemo(
    () =>
      isLiveSessionActive && currentUser.data
        ? [
            {
              id: currentUser.data.id,
              name: currentUser.data.username ?? 'You',
              profileImageUrl: currentUser.data.profileImageUrl,
              isCurrentUser: true,
            },
            ...activeEditors.map((editor) => ({ ...editor, isCurrentUser: false })),
          ]
        : activeEditors.map((editor) => ({ ...editor, isCurrentUser: false })),
    [activeEditors, currentUser.data, isLiveSessionActive],
  );
  const collaborationNoteId = noteId;
  const onPresenceChange = useCallback(
    (users: { id: number; name: string; profileImageUrl?: string | null }[]) => {
      if (users.length) {
        if (presenceClearTimer.current)
          clearTimeout(presenceClearTimer.current);
        presenceClearTimer.current = null;
        setActiveEditors(users);
        return;
      }
      if (presenceClearTimer.current) clearTimeout(presenceClearTimer.current);
      presenceClearTimer.current = setTimeout(() => {
        setActiveEditors([]);
        presenceClearTimer.current = null;
      }, 1_500);
    },
    [],
  );
  useEffect(
    () => () => {
      if (presenceClearTimer.current) clearTimeout(presenceClearTimer.current);
    },
    [],
  );
  const onCollaborationAccessRevoked = useCallback(
    (removeNote: boolean) => {
      if (removeNote && noteId) {
        queryClient.setQueryData<Note[]>(queryKeys.notes, (notes = []) =>
          notes.filter((item) => item.id !== noteId),
        );
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      selectNote(null);
    },
    [noteId, queryClient, selectNote],
  );
  const onLiveStatusChange = useCallback((isLive: boolean) => {
    setIsLiveSessionActive(isLive);
  }, []);
  const toggleCollaboratorNames = useCallback(() => {
    setShowCollaboratorNames((show) => {
      const next = !show;
      window.localStorage.setItem(collaboratorNamesStorageKey, String(next));
      return next;
    });
  }, []);
  const syncCollaborativeNoteCache = useCallback(
    (nextTitle: string, nextContent: string) => {
      if (!note?.access.isCollaborative) return;
      const updateCachedNote = (item: Note): Note => ({
        ...item,
        title: nextTitle,
        content: nextContent,
      });
      queryClient.setQueryData<Note[]>(queryKeys.notes, (notes = []) =>
        notes.map((item) =>
          item.id === note.id ? updateCachedNote(item) : item,
        ),
      );
      queryClient.setQueryData<Note>(queryKeys.note(note.id), (item) =>
        item
          ? {
              ...item,
              title: nextTitle,
              content: nextContent,
            }
          : item,
      );
    },
    [note, queryClient],
  );
  const collaborationOptions = useMemo(
    () =>
      isLiveCollaborative && currentUser.data && collaborationNoteId
        ? {
            noteId: collaborationNoteId,
            user: {
              id: currentUser.data.id,
              name: currentUser.data.username ?? 'Notes user',
              color: collaboratorColor(currentUser.data.id),
              profileImageUrl: currentUser.data.profileImageUrl,
            },
            onPresenceChange,
            onAccessRevoked: onCollaborationAccessRevoked,
            onLiveStatusChange,
            showUsernames: showCollaboratorNames,
          }
        : undefined,
    [
      collaborationNoteId,
      currentUser.data,
      isLiveCollaborative,
      onPresenceChange,
      onCollaborationAccessRevoked,
      onLiveStatusChange,
      showCollaboratorNames,
    ],
  );

  const passwordRef = useRef<string | null>(null);
  const lastSaved = useRef(
    note
      ? JSON.stringify({
          title: note.title,
          tags: note.tags.map((tag) => tag.id),
          ...(!note.access.isCollaborative && { content: note.content }),
        })
      : '',
  );
  const lastCreateAttempt = useRef('');

  useEffect(() => {
    const stored = window.localStorage.getItem(collaboratorNamesStorageKey);
    if (stored !== null) setShowCollaboratorNames(stored === 'true');
    const onStorage = (event: StorageEvent) => {
      if (event.key === collaboratorNamesStorageKey)
        setShowCollaboratorNames(event.newValue !== 'false');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!note || !dirty || !toPlainText(content)) return;

    const payload = {
      title: persistedTitle(title),
      tags: tagIds,
      ...(!note.access.isCollaborative && { content }),
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSaved.current) return;

    const timer = window.setTimeout(async () => {
      lastSaved.current = serialized;
      try {
        const body = note.isLocked
          ? (() => {
              if (!passwordRef.current || !note.contentEncryptionSalt)
                throw new Error('Lock this note again to continue editing.');
              return encryptNoteContent(
                content,
                passwordRef.current,
                note.contentEncryptionSalt,
              );
            })()
          : Promise.resolve({ content, contentEncryptionIv: undefined });
        const encrypted = await body;
        updateNote.mutate(
          {
            id: note.id,
            body: {
              title: persistedTitle(title),
              ...(!note.access.isCollaborative && {
                content: encrypted.content,
              }),
              ...(isOwner && { tags: tagIds }),
              ...(!note.access.isCollaborative && encrypted.contentEncryptionIv
                ? { contentEncryptionIv: encrypted.contentEncryptionIv }
                : {}),
            },
          },
          {
            onError: () => {
              lastSaved.current = '';
            },
          },
        );
      } catch {
        lastSaved.current = '';
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    content,
    dirty,
    isOwner,
    note,
    tagIds,
    title,
    updateNote,
  ]);

  useEffect(() => {
    if (!draft || !toPlainText(content) || createNote.isPending) return;

    const payload = createNoteSchema.safeParse({
      title: persistedTitle(title),
      content,
      tags: tagIds,
    });
    if (!payload.success) return;

    const serialized = JSON.stringify(payload.data);
    if (lastCreateAttempt.current === serialized) return;

    const timer = window.setTimeout(() => {
      lastCreateAttempt.current = serialized;
      createNote.mutate(payload.data, {
        onSuccess: (created) => {
          onCreated(created);
          clearDraft();
        },
        onError: () => {
          lastCreateAttempt.current = '';
        },
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [content, createNote, draft, tagIds, title, clearDraft, onCreated]);

  function updateField(next: Partial<NoteFields>) {
    const nextTitle = next.title ?? title;
    const nextContent = next.content ?? content;
    const nextTags = next.tags ?? tagIds;

    setTitle(nextTitle);
    setContent(nextContent);
    setTagIds(nextTags);

    if (draft) {
      updateDraft({ title: nextTitle, content: nextContent, tags: nextTags });
    } else {
      syncCollaborativeNoteCache(nextTitle, nextContent);
      setDirty(true);
    }
  }

  async function unlockForEditing() {
    if (
      !note?.contentEncryptionSalt ||
      !note.contentEncryptionIv ||
      !unlockPassword
    )
      return;
    try {
      const plaintext = await decryptNoteContent(
        note.content,
        unlockPassword,
        note.contentEncryptionSalt,
        note.contentEncryptionIv,
      );
      passwordRef.current = unlockPassword;
      setContent(plaintext);
      lastSaved.current = JSON.stringify({
        title: note.title,
        content: plaintext,
        tags: note.tags.map((tag) => tag.id),
      });
      setUnlockPassword('');
      setUnlockError('');
      setIsUnlocked(true);
    } catch {
      setUnlockError('That password could not unlock this note.');
    }
  }

  async function lockCurrentNote() {
    if (!note || !lockPassword || !content) return;
    try {
      const encrypted = await encryptNoteContent(content, lockPassword);
      await lockNote.mutateAsync({ id: note.id, body: encrypted });
      passwordRef.current = null;
      setContent('');
      setLockPassword('');
      setLockFormOpen(false);
      setIsUnlocked(false);
    } catch (error) {
      setLockError(formatApiError(error));
    }
  }

  async function removeLock() {
    if (!note || !isUnlocked) return;
    try {
      await unlockNote.mutateAsync({ id: note.id, body: { content } });
      passwordRef.current = null;
    } catch (error) {
      setLockError(formatApiError(error));
    }
  }

  if (!note && !draft && !isDiscarding) return null;

  if (note?.isLocked && !isUnlocked) {
    return (
      <motion.section
        key={`locked-note-${note.id}`}
        initial={{ opacity: 0, y: 14, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={editorTransition}
        className="flex min-h-[calc(100svh-3.5rem)] min-w-0 flex-1 flex-col"
      >
        <header className="flex min-h-14 items-center border-b px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-1 lg:hidden"
            onClick={onBack}
            aria-label="Back to notes"
          >
            <ArrowLeft />
          </Button>
        </header>
        <main className="grid flex-1 place-items-center p-5 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...editorTransition, delay: 0.03 }}
            className="w-full max-w-sm space-y-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.82, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 430, damping: 28 }}
              className="mx-auto flex size-10 items-center justify-center rounded-lg border bg-muted"
            >
              <LockKeyhole className="size-4" />
            </motion.div>
            <div>
              <h2 className="font-semibold">{note.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                This note’s content is encrypted. Enter its password to open it.
              </p>
            </div>
            <Input
              type="password"
              value={unlockPassword}
              onChange={(event) => {
                setUnlockPassword(event.target.value);
                setUnlockError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void unlockForEditing();
              }}
              autoComplete="off"
              autoFocus
              placeholder="Note password"
              aria-label="Note password"
              aria-invalid={Boolean(unlockError)}
            />
            {unlockError && (
              <p role="alert" className="text-destructive text-sm">
                {unlockError}
              </p>
            )}
            <Button
              className="w-full"
              onClick={() => void unlockForEditing()}
              disabled={!unlockPassword}
            >
              Unlock note
            </Button>
          </motion.div>
        </main>
      </motion.section>
    );
  }

  const isDraft = Boolean(draft) || isDiscarding;
  const isSaving = createNote.isPending || updateNote.isPending;
  const saveStatus =
    isDiscarding || (isDraft && !toPlainText(content))
      ? null
      : isSaving
        ? 'Saving…'
        : 'Saved';

  function closeLockForm() {
    setLockFormOpen(false);
    setLockPassword('');
    setLockError('');
  }

  const lockControls =
    !isDraft &&
    note &&
    isOwner &&
    (note.isLocked ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void removeLock()}
        disabled={unlockNote.isPending}
      >
        <LockKeyholeOpen />
        Unlock
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (lockFormOpen ? closeLockForm() : setLockFormOpen(true))}
        aria-label={lockFormOpen ? 'Cancel locking' : undefined}
        aria-expanded={lockFormOpen}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {lockFormOpen ? (
            <motion.span
              key="cancel-lock"
              initial={{ opacity: 0, x: -8, filter: 'blur(3px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 8, filter: 'blur(3px)' }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex items-center"
            >
              <X />
            </motion.span>
          ) : (
            <motion.span
              key="open-lock"
              initial={{ opacity: 0, x: -5, filter: 'blur(3px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 5, filter: 'blur(3px)' }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex items-center gap-2"
            >
              <LockKeyhole />
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.11, ease: 'easeOut' }}
              >
                Lock
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    ));

  const lockPasswordPanel = !isDraft && note && !note.isLocked && (
    <AnimatePresence initial={false}>
      {lockFormOpen && (
        <motion.form
          initial={{ opacity: 0, y: -10, height: 0, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, height: 'auto', filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, height: 0, filter: 'blur(5px)' }}
          transition={editorTransition}
          onSubmit={(event) => {
            event.preventDefault();
            void lockCurrentNote();
          }}
          className="overflow-hidden border-b"
        >
          <div className="bg-muted/35 px-4 py-2.5 sm:px-6">
            <div className="ml-auto flex w-full max-w-sm items-center gap-2">
              <Input
                className="min-w-0 flex-1"
                type="password"
                value={lockPassword}
                onChange={(event) => {
                  setLockPassword(event.target.value);
                  setLockError('');
                }}
                autoComplete="new-password"
                autoFocus
                placeholder="Set a note password"
                aria-label="Set a note password"
                aria-invalid={Boolean(lockError)}
              />
              <Button
                type="submit"
                className="shrink-0"
                disabled={!lockPassword || lockNote.isPending}
              >
                {lockNote.isPending && (
                  <LoaderCircle className="animate-spin" />
                )}
                Lock note
              </Button>
            </div>
            {lockError && (
              <p
                role="alert"
                className="text-destructive ml-auto mt-1.5 w-full max-w-sm text-xs"
              >
                {lockError}
              </p>
            )}
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 14, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={editorTransition}
      className={`note-editor flex min-h-[calc(100svh-3.5rem)] min-w-0 flex-1 flex-col ${isOwner ? '' : 'note-editor--editor'}`}
    >
      <header className="note-editor-header flex min-h-14 flex-wrap items-center gap-x-3 border-b px-4 sm:px-6">
        <div className="text-muted-foreground mr-auto flex items-center gap-2 text-xs">
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-1 lg:hidden"
            onClick={onBack}
            aria-label="Back to notes"
          >
            <ArrowLeft />
          </Button>
          <AnimatePresence mode="wait">
            {saveStatus && (
              <motion.span
                key={saveStatus}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                className="flex items-center gap-1.5"
              >
                {isSaving ? (
                  <LoaderCircle className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3 text-emerald-600" />
                )}
                {saveStatus}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 py-1">
          <AnimatePresence initial={false}>
            {hasActiveCollaboration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, x: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: 6 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="collaboration-header-controls flex shrink-0 items-center gap-1"
              >
                <Tooltip.Provider delayDuration={180}>
                  <AvatarGroup
                    className="mr-1 flex"
                    aria-label={`${connectedEditors.length} editor${connectedEditors.length === 1 ? '' : 's'} connected`}
                  >
                    {connectedEditors.slice(0, 3).map((editor) => (
                      <Tooltip.Root key={editor.id}>
                        <Tooltip.Trigger asChild>
                          <span className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <UserAvatar name={editor.name} imageUrl={editor.profileImageUrl} />
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="bottom"
                            sideOffset={8}
                            className="z-50 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                          >
                            <span className="font-medium">
                              {editor.isCurrentUser ? 'You' : editor.name}
                            </span>
                            <span className="text-muted-foreground ml-1.5">
                              Connected
                            </span>
                            <Tooltip.Arrow className="fill-border" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    ))}
                    {connectedEditors.length > 3 && (
                      <AvatarGroupCount>+{connectedEditors.length - 3}</AvatarGroupCount>
                    )}
                  </AvatarGroup>
                </Tooltip.Provider>
                <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 sm:inline-flex dark:text-emerald-400">
                  Live
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollaboratorNames}
                  aria-label={
                    showCollaboratorNames
                      ? 'Hide collaborator names'
                      : 'Show collaborator names'
                  }
                  title={
                    showCollaboratorNames
                      ? 'Hide collaborator names'
                      : 'Show collaborator names'
                  }
                >
                  {showCollaboratorNames ? <Eye /> : <EyeOff />}
                  Names
                </Button>
                <span
                  aria-hidden
                  className="collaboration-action-separator mx-1 h-5 w-px bg-border"
                />
              </motion.div>
            )}
          </AnimatePresence>
          {!isDraft && note && isOwner && <ShareDialog note={note} />}
          {lockControls}
          {isDraft ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsDiscarding(true);
                clearDraft();
              }}
            >
              <X /> Discard
            </Button>
          ) : isOwner ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => note && onDelete(note)}
            >
              <Trash2 /> Delete
            </Button>
          ) : null}
        </div>
      </header>
      <AnimatePresence initial={false}>
        {hasActiveCollaboration && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="collaboration-overflow-frame"
          >
            <Tooltip.Provider delayDuration={180}>
              <AvatarGroup
                className="mr-1 flex"
                aria-label={`${connectedEditors.length} editor${connectedEditors.length === 1 ? '' : 's'} connected`}
              >
                {connectedEditors.slice(0, 3).map((editor) => (
                  <Tooltip.Root key={editor.id}>
                    <Tooltip.Trigger asChild>
                      <span className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <UserAvatar name={editor.name} imageUrl={editor.profileImageUrl} />
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="bottom"
                        sideOffset={8}
                        className="z-50 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                      >
                        <span className="font-medium">
                          {editor.isCurrentUser ? 'You' : editor.name}
                        </span>
                        <span className="text-muted-foreground ml-1.5">
                          Connected
                        </span>
                        <Tooltip.Arrow className="fill-border" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                ))}
                {connectedEditors.length > 3 && (
                  <AvatarGroupCount>+{connectedEditors.length - 3}</AvatarGroupCount>
                )}
              </AvatarGroup>
            </Tooltip.Provider>
            <span className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Live
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollaboratorNames}
              aria-label={showCollaboratorNames ? 'Hide collaborator names' : 'Show collaborator names'}
              title={showCollaboratorNames ? 'Hide collaborator names' : 'Show collaborator names'}
            >
              {showCollaboratorNames ? <Eye /> : <EyeOff />}
              Names
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {lockPasswordPanel}
      {lockError && !lockFormOpen && (
        <p
          role="alert"
          className="text-destructive border-b px-4 py-2 text-xs sm:px-6"
        >
          {lockError}
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col px-5 py-7 sm:px-8 lg:px-10">
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <Input
            value={title}
            onChange={(event) => updateField({ title: event.target.value })}
            placeholder="Untitled note"
            aria-label="Note title"
            readOnly={isReadOnly}
            className="h-auto border-0 bg-transparent px-0 py-1 text-4xl font-semibold tracking-tight shadow-none placeholder:text-muted-foreground/70 focus-visible:bg-transparent focus-visible:ring-0 dark:bg-transparent dark:focus-visible:bg-transparent md:text-[2.5rem] lg:text-4xl"
          />
          {isOwner && (
            <TagSelector
              tags={tags.data ?? []}
              selectedIds={tagIds}
              onChange={(nextTagIds) => updateField({ tags: nextTagIds })}
            />
          )}
          <RichTextEditor
            key={
              note?.access.isCollaborative
                ? `collaboration-${note.id}`
                : 'editor'
            }
            content={content}
            onChange={(nextContent) => updateField({ content: nextContent })}
            editable={!isReadOnly}
            collaboration={collaborationOptions}
          />
          {isDraft && !toPlainText(content) && (
            <p className="text-muted-foreground mt-4 text-xs">
              Start writing and this note will be created automatically.
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function TagSelector({
  tags,
  selectedIds,
  onChange,
}: {
  tags: NoteTag[];
  selectedIds: number[];
  onChange: (tagIds: number[]) => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const createTag = useCreateTag();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState('');
  const selectedTags = tags.filter((tag) => selectedIds.includes(tag.id));
  const normalizedQuery = query.trim();
  const availableTags = useMemo(
    () =>
      tags.filter(
        (tag) =>
          !selectedIds.includes(tag.id) &&
          tag.name.toLowerCase().includes(normalizedQuery.toLowerCase()),
      ),
    [normalizedQuery, selectedIds, tags],
  );
  const hasExactMatch = tags.some(
    (tag) => tag.name.trim().toLowerCase() === normalizedQuery.toLowerCase(),
  );
  const canCreate = Boolean(normalizedQuery) && !hasExactMatch;
  const optionCount = availableTags.length + Number(canCreate);

  function addTag(tag: NoteTag) {
    onChange([...selectedIds, tag.id]);
    setQuery('');
    setActiveIndex(0);
    setError('');
    setOpen(false);
  }

  async function createAndAddTag() {
    const payload = createTagSchema.safeParse({ name: normalizedQuery });
    if (!payload.success) {
      setError(payload.error.issues[0]?.message ?? 'Enter a valid tag name.');
      return;
    }

    setError('');
    try {
      const tag = await createTag.mutateAsync(payload.data);
      addTag(tag);
    } catch (caught) {
      setError(formatApiError(caught));
    }
  }

  function removeTag(id: number) {
    onChange(selectedIds.filter((tagId) => tagId !== id));
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        Math.min(index + 1, Math.max(optionCount - 1, 0)),
      );
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && availableTags[activeIndex]) {
      event.preventDefault();
      addTag(availableTags[activeIndex]);
    }
    if (
      event.key === 'Enter' &&
      activeIndex === availableTags.length &&
      canCreate &&
      !createTag.isPending
    ) {
      event.preventDefault();
      void createAndAddTag();
    }
    if (event.key === 'Escape') setOpen(false);
    if (event.key === 'Backspace' && !query && selectedIds.length)
      removeTag(selectedIds[selectedIds.length - 1]);
  }

  return (
    <div className="relative mt-5">
      <label htmlFor="note-tags" className="sr-only">
        Tags
      </label>
      <LayoutGroup>
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-background p-1.5 shadow-xs transition-[border,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-background"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {selectedTags.map((tag) => (
              <motion.span
                layout="position"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={tag.id}
                className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
              >
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="hover:bg-background -mr-0.5 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${tag.name} tag`}
                >
                  <X className="size-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <motion.div
            layout="position"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="flex min-w-28 flex-1"
          >
            <input
              ref={inputRef}
              id="note-tags"
              value={query}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 100)}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
                setError('');
                setOpen(true);
              }}
              onKeyDown={onKeyDown}
              className="w-full bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
              placeholder={selectedTags.length ? 'Add a tag…' : 'Add tags…'}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={open}
              aria-activedescendant={
                open && availableTags[activeIndex]
                  ? `${listId}-${availableTags[activeIndex].id}`
                  : open && canCreate && activeIndex === availableTags.length
                    ? `${listId}-create`
                    : undefined
              }
            />
          </motion.div>
        </motion.div>
      </LayoutGroup>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            id={listId}
            role="listbox"
            className="bg-popover text-popover-foreground absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border p-1 shadow-md"
          >
            {availableTags.map((tag, index) => (
              <button
                key={tag.id}
                id={`${listId}-${tag.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(tag)}
                className={`flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors ${index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
              >
                <Tag className="mr-2 size-3.5 text-muted-foreground" />
                {tag.name}
              </button>
            ))}
            {canCreate && (
              <button
                id={`${listId}-create`}
                type="button"
                role="option"
                aria-selected={activeIndex === availableTags.length}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void createAndAddTag()}
                disabled={createTag.isPending}
                className={`flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm font-medium outline-none transition-colors disabled:opacity-60 ${activeIndex === availableTags.length ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
              >
                {createTag.isPending ? (
                  <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-3.5" />
                )}
                Create “{normalizedQuery}”
              </button>
            )}
            {!availableTags.length && !canCreate && (
              <p className="text-muted-foreground px-2.5 py-3 text-sm">
                {tags.length
                  ? 'No matching tags.'
                  : 'Start typing to create your first tag.'}
              </p>
            )}
            {error && (
              <p role="alert" className="text-destructive px-2.5 py-2 text-xs">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
