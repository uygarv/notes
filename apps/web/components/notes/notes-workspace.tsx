'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownAZ, CalendarArrowDown, Clock3, Search, Plus, Tag as TagIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Note } from '@notes/schemas';
import { formatDate, formatApiError, toPlainText } from '@/lib/utils';
import { useDeleteNote, useNotes, useTags } from '@/lib/queries';
import { useUiStore } from '@/lib/store';
import { NoteEditor } from '@/components/notes/note-editor';
import { TagManager } from '@/components/tags/tag-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogPrimitive } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type SortOption = 'updated-desc' | 'created-desc' | 'title-asc';

export function NotesWorkspace() {
  const notes = useNotes();
  const tags = useTags();
  const deleteNote = useDeleteNote();
  const storedSelectedNoteId = useUiStore((state) => state.selectedNoteId);
  const selectNote = useUiStore((state) => state.selectNote);
  const draft = useUiStore((state) => state.draft);
  const draftId = useUiStore((state) => state.draftId);
  const startDraft = useUiStore((state) => state.startDraft);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [sort, setSort] = useState<SortOption>('updated-desc');
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [createdFromDraftId, setCreatedFromDraftId] = useState<number | null>(null);
  const [createdNote, setCreatedNote] = useState<Note | null>(null);
  const selectedNoteId = storedSelectedNoteId;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateLayout = () => setIsCompactLayout(media.matches);
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  const openNote = useCallback((noteId: number) => {
    setCreatedNote(null);
    setCreatedFromDraftId(null);
    selectNote(noteId);
  }, [selectNote]);

  const startNewNote = useCallback(() => {
    setCreatedNote(null);
    setCreatedFromDraftId(null);
    startDraft();
  }, [startDraft]);

  const closeEditor = useCallback(() => {
    setCreatedNote(null);
    setCreatedFromDraftId(null);
    selectNote(null);
  }, [selectNote]);

  const handleNoteCreated = useCallback((note: Note) => {
    setCreatedFromDraftId(note.id);
    setCreatedNote(note);
    selectNote(note.id);
  }, [selectNote]);

  const filtered = useMemo(() => (notes.data ?? []).filter((note) => {
    const needle = search.trim().toLowerCase();
    const match = !needle || [note.title, toPlainText(note.content), ...note.tags.map((tag) => tag.name)].some((value) => value.toLowerCase().includes(needle));
    return match && (tagFilter === null || note.tags.some((tag) => tag.id === tagFilter));
  }), [notes.data, search, tagFilter]);
  const selected = notes.data?.find((note) => note.id === selectedNoteId)
    ?? (createdNote?.id === selectedNoteId ? createdNote : null);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sort === 'title-asc') return a.title.localeCompare(b.title);
    if (sort === 'created-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }), [filtered, sort]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); startNewNote(); }
      if (event.key === 'ArrowDown' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') { const index = sorted.findIndex((note) => note.id === selectedNoteId); if (sorted[index + 1]) openNote(sorted[index + 1].id); }
      if (event.key === 'ArrowUp' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') { const index = sorted.findIndex((note) => note.id === selectedNoteId); if (sorted[index - 1]) openNote(sorted[index - 1].id); }
    }
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, [openNote, selectedNoteId, sorted, startNewNote]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteError('');
    try { await deleteNote.mutateAsync(deleting.id); if (selectedNoteId === deleting.id) { const next = notes.data?.find((note) => note.id !== deleting.id); if (next) openNote(next.id); else closeEditor(); } setDeleteDialogOpen(false); } catch (error) { setDeleteError(formatApiError(error)); }
  }

  function requestDelete(note: Note) {
    setDeleting(note);
    setDeleteError('');
    setDeleteDialogOpen(true);
  }

  const hasEditor = Boolean(selected || draft);
  const editorTransitionKey = draft
    ? `editor-draft-${draftId}`
    : createdFromDraftId === selected?.id
    ? `editor-draft-${draftId}`
    : `editor-${selected?.id ?? 'draft'}`;
  const notesPanel = <NotesPanel noteCount={notes.data?.length ?? 0} tags={tags.data ?? []} search={search} setSearch={setSearch} tagFilter={tagFilter} setTagFilter={setTagFilter} setSort={setSort} notes={sorted} selectedId={selectedNoteId} pending={notes.isPending} onSelect={openNote} onNew={startNewNote} />;
  const editor = <NoteEditor key={editorTransitionKey} note={selected} onDelete={requestDelete} onBack={closeEditor} onCreated={handleNoteCreated} />;

  return <div className="flex min-h-[calc(100svh-3.5rem)] min-w-0 flex-1">{isCompactLayout ? <div className="relative flex min-w-0 flex-1 overflow-x-hidden"><AnimatePresence initial={false} mode="wait">{hasEditor ? <motion.div key={editorTransitionKey} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1, ease: 'easeOut' }} className="flex min-w-0 flex-1">{editor}</motion.div> : <motion.div key="notes" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1, ease: 'easeOut' }} className="flex min-w-0 flex-1">{notesPanel}</motion.div>}</AnimatePresence></div> : <div className="flex min-w-0 flex-1">{notesPanel}<AnimatePresence initial={false} mode="wait">{hasEditor && <motion.div key={editorTransitionKey} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1, ease: 'easeOut' }} className="flex min-w-0 flex-1">{editor}</motion.div>}</AnimatePresence></div>}<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent><AlertDialogPrimitive.Title className="text-base font-semibold">Delete “{deleting?.title ?? 'this note'}”?</AlertDialogPrimitive.Title><AlertDialogPrimitive.Description className="text-muted-foreground mt-2 text-sm leading-6">This note will be permanently removed. This action cannot be undone.</AlertDialogPrimitive.Description>{deleteError && <p role="alert" className="text-destructive mt-3 text-sm">{deleteError}</p>}<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={confirmDelete}>Delete note</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}

function NotesPanel({ noteCount, tags, search, setSearch, tagFilter, setTagFilter, setSort, notes, selectedId, pending, onSelect, onNew }: { noteCount: number; tags: { id: number; name: string }[]; search: string; setSearch: (value: string) => void; tagFilter: number | null; setTagFilter: (value: number | null) => void; setSort: (value: SortOption) => void; notes: Note[]; selectedId: number | null; pending: boolean; onSelect: (id: number) => void; onNew: () => void }) {
  return <section className="bg-muted/20 flex min-h-0 w-full flex-col border-r lg:w-[22rem] lg:shrink-0"><header className="space-y-3 border-b p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">All notes</h2><p className="text-muted-foreground mt-0.5 text-xs">{noteCount} notes</p></div><div className="flex items-center"><TagManager /><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Sort notes"><ArrowDownAZ /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setSort('updated-desc')}><Clock3 />Last updated</DropdownMenuItem><DropdownMenuItem onSelect={() => setSort('created-desc')}><CalendarArrowDown />Date created</DropdownMenuItem><DropdownMenuItem onSelect={() => setSort('title-asc')}><ArrowDownAZ />Alphabetical</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Button variant="ghost" size="icon-sm" onClick={onNew} aria-label="Create note"><Plus /></Button></div></div><div className="relative"><Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" /><Input className="pl-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" aria-label="Search notes" /></div><div className="flex gap-1 overflow-x-auto pb-0.5"><button onClick={() => setTagFilter(null)} className={`shrink-0 rounded-md px-2 py-1 text-xs transition-colors ${tagFilter === null ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>All</button>{tags.map((tag) => <button key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)} className={`shrink-0 rounded-md px-2 py-1 text-xs transition-colors ${tagFilter === tag.id ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>{tag.name}</button>)}</div></header><div className="min-h-0 flex-1 overflow-y-auto p-2"><NotesList notes={notes} selectedId={selectedId} pending={pending} onSelect={onSelect} onNew={onNew} /></div></section>;
}

function NotesList({ notes, selectedId, pending, onSelect, onNew }: { notes: Note[]; selectedId: number | null; pending: boolean; onSelect: (id: number) => void; onNew: () => void }) {
  if (pending) return <div className="space-y-2 px-2"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;
  if (!notes.length) return <div className="grid min-h-48 place-items-center px-5 text-center"><div><Search className="text-muted-foreground mx-auto size-5" /><p className="mt-3 text-sm font-medium">No notes found</p><p className="text-muted-foreground mt-1 text-xs">Try another search or start something new.</p><Button className="mt-4" variant="outline" size="sm" onClick={onNew}><Plus /> New note</Button></div></div>;
  return <AnimatePresence initial={false}>{notes.map((note) => <motion.button layout key={note.id} initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} onClick={() => onSelect(note.id)} className={`mb-1 w-full rounded-md border border-transparent p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${selectedId === note.id ? 'border-border bg-background shadow-xs' : 'hover:bg-accent/70'}`}><div className="flex items-baseline justify-between gap-3"><span className="truncate text-[15px] font-semibold">{note.title}</span><span className="text-muted-foreground shrink-0 text-[10px]">{formatDate(note.updatedAt)}</span></div><p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">{toPlainText(note.content) || 'Empty note'}</p>{note.tags.length > 0 && <div className="mt-2 flex gap-2 overflow-hidden">{note.tags.slice(0, 3).map((tag) => <span key={tag.id} className="text-muted-foreground inline-flex items-center gap-1 truncate text-[10px]"><TagIcon className="size-2.5" />{tag.name}</span>)}</div>}</motion.button>)}</AnimatePresence>;
}
