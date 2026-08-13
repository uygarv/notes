'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, Tag, Trash2, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import type { Note, Tag as NoteTag } from '@notes/schemas';
import { createNoteSchema } from '@notes/schemas';
import { useCreateNote, useTags, useUpdateNote } from '@/lib/queries';
import { useUiStore } from '@/lib/store';
import { toPlainText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/notes/rich-text-editor';

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

function persistedTitle(title: string) {
  return title.trim() || 'Untitled note';
}

export function NoteEditor({ note, onDelete, onBack, onCreated }: EditorProps) {
  const draft = useUiStore((state) => state.draft);
  const updateDraft = useUiStore((state) => state.updateDraft);
  const clearDraft = useUiStore((state) => state.clearDraft);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const tags = useTags();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [tagIds, setTagIds] = useState<number[]>(note?.tags.map((tag) => tag.id) ?? []);
  const [dirty, setDirty] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const lastSaved = useRef(note ? JSON.stringify({ title: note.title, content: note.content, tags: note.tags.map((tag) => tag.id) }) : '');
  const lastCreateAttempt = useRef('');

  useEffect(() => {
    if (!note || !dirty || !toPlainText(content)) return;

    const payload = { title: persistedTitle(title), content, tags: tagIds };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSaved.current) return;

    const timer = window.setTimeout(() => {
      lastSaved.current = serialized;
      updateNote.mutate(
        { id: note.id, body: payload },
        { onError: () => { lastSaved.current = ''; } },
      );
    }, 650);

    return () => window.clearTimeout(timer);
  }, [content, dirty, note, tagIds, title, updateNote]);

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
          clearDraft();
          onCreated(created);
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
      setDirty(true);
    }
  }

  if (!note && !draft && !isDiscarding) return null;

  const isDraft = Boolean(draft) || isDiscarding;
  const isSaving = createNote.isPending || updateNote.isPending;
  const saveStatus = isDiscarding || (isDraft && !toPlainText(content)) ? null : isSaving ? 'Saving…' : 'Saved';

  return <section className="flex min-h-[calc(100svh-3.5rem)] min-w-0 flex-1 flex-col"><header className="flex min-h-14 items-center justify-between border-b px-4 sm:px-6"><div className="text-muted-foreground flex items-center gap-2 text-xs"><Button variant="ghost" size="icon-sm" className="-ml-1 lg:hidden" onClick={onBack} aria-label="Back to notes"><ArrowLeft /></Button><AnimatePresence mode="wait">{saveStatus && <motion.span key={saveStatus} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} className="flex items-center gap-1.5">{isSaving ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3 text-emerald-600" />}{saveStatus}</motion.span>}</AnimatePresence></div><div className="flex items-center gap-1">{isDraft ? <Button variant="ghost" size="sm" onClick={() => { setIsDiscarding(true); clearDraft(); }}><X /> Discard</Button> : <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => note && onDelete(note)}><Trash2 /> Delete</Button>}</div></header><div className="flex min-h-0 flex-1 flex-col px-5 py-7 sm:px-8 lg:px-10"><div className="flex min-h-0 w-full flex-1 flex-col"><Input value={title} onChange={(event) => updateField({ title: event.target.value })} placeholder="Untitled note" aria-label="Note title" className="h-auto border-0 bg-transparent px-0 py-1 text-4xl font-semibold tracking-tight shadow-none placeholder:text-muted-foreground/70 focus-visible:bg-transparent focus-visible:ring-0 dark:bg-transparent dark:focus-visible:bg-transparent md:text-[2.5rem] lg:text-4xl" /><TagSelector tags={tags.data ?? []} selectedIds={tagIds} onChange={(nextTagIds) => updateField({ tags: nextTagIds })} /><RichTextEditor content={content} onChange={(nextContent) => updateField({ content: nextContent })} />{isDraft && !toPlainText(content) && <p className="text-muted-foreground mt-4 text-xs">Start writing and this note will be created automatically.</p>}</div></div></section>;
}

function TagSelector({ tags, selectedIds, onChange }: { tags: NoteTag[]; selectedIds: number[]; onChange: (tagIds: number[]) => void }) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedTags = tags.filter((tag) => selectedIds.includes(tag.id));
  const availableTags = useMemo(() => tags.filter((tag) => !selectedIds.includes(tag.id) && tag.name.toLowerCase().includes(query.trim().toLowerCase())), [query, selectedIds, tags]);

  function addTag(tag: NoteTag) {
    onChange([...selectedIds, tag.id]);
    setQuery('');
    setActiveIndex(0);
    setOpen(false);
  }

  function removeTag(id: number) {
    onChange(selectedIds.filter((tagId) => tagId !== id));
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(availableTags.length - 1, 0)));
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
    if (event.key === 'Escape') setOpen(false);
    if (event.key === 'Backspace' && !query && selectedIds.length) removeTag(selectedIds[selectedIds.length - 1]);
  }

  return <div className="relative mt-5"><label htmlFor="note-tags" className="sr-only">Tags</label><LayoutGroup><motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-background p-1.5 shadow-xs transition-[border,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-background"><AnimatePresence initial={false} mode="popLayout">{selectedTags.map((tag) => <motion.span layout="position" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={tag.id} className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"><span>{tag.name}</span><button type="button" onClick={() => removeTag(tag.id)} className="hover:bg-background -mr-0.5 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${tag.name} tag`}><X className="size-3" /></button></motion.span>)}</AnimatePresence><motion.div layout="position" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="flex min-w-28 flex-1"><input ref={inputRef} id="note-tags" value={query} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 100)} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }} onKeyDown={onKeyDown} className="w-full bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground" placeholder={selectedTags.length ? 'Add a tag…' : 'Add tags…'} role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={open} aria-activedescendant={open && availableTags[activeIndex] ? `${listId}-${availableTags[activeIndex].id}` : undefined} /></motion.div></motion.div></LayoutGroup><AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }} id={listId} role="listbox" className="bg-popover text-popover-foreground absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border p-1 shadow-md">{availableTags.length ? availableTags.map((tag, index) => <button key={tag.id} id={`${listId}-${tag.id}`} type="button" role="option" aria-selected={index === activeIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(tag)} className={`flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors ${index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}><Tag className="mr-2 size-3.5 text-muted-foreground" />{tag.name}</button>) : <p className="text-muted-foreground px-2.5 py-3 text-sm">{tags.length ? 'No matching tags.' : 'No tags yet. Create one from the sidebar.'}</p>}</motion.div>}</AnimatePresence></div>;
}
