'use client';

import { FormEvent, useState } from 'react';
import { Pencil, Plus, Tag, Tags, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createTagSchema, updateTagSchema } from '@notes/schemas';
import { formatApiError } from '@/lib/utils';
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function TagManager() {
  const tags = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (editing === null) {
        const result = createTagSchema.safeParse({ name });
        if (!result.success) { setError(result.error.issues[0]?.message ?? 'Enter a tag name.'); return; }
        await createTag.mutateAsync(result.data);
      } else {
        const result = updateTagSchema.safeParse({ name });
        if (!result.success) { setError(result.error.issues[0]?.message ?? 'Enter a tag name.'); return; }
        await updateTag.mutateAsync({ id: editing, body: result.data });
      }
      setName(''); setEditing(null);
    } catch (caught) { setError(formatApiError(caught)); }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="sm"><Tags /> Manage tags</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="text-base font-semibold">Manage tags</DialogTitle><DialogDescription className="text-muted-foreground text-sm">Tags are private to your workspace.</DialogDescription></DialogHeader><form className="flex gap-2" onSubmit={submit}><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={editing === null ? 'New tag name' : 'Rename tag'} autoFocus /><Button type="submit" size="icon" aria-label={editing === null ? 'Create tag' : 'Save tag'}>{editing === null ? <Plus /> : <Pencil />}</Button></form>{error && <p role="alert" className="text-destructive text-xs">{error}</p>}<div className="max-h-72 space-y-1 overflow-y-auto"><AnimatePresence initial={false}>{tags.data?.map((tag) => <motion.div key={tag.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -8 }} className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-2"><Tag className="text-muted-foreground size-3.5" /><span className="min-w-0 flex-1 truncate text-sm">{tag.name}</span><Button variant="ghost" size="icon-sm" aria-label={`Rename ${tag.name}`} onClick={() => { setEditing(tag.id); setName(tag.name); }}><Pencil /></Button><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${tag.name}`} onClick={() => deleteTag.mutate(tag.id)}><Trash2 /></Button></motion.div>)}</AnimatePresence>{tags.data?.length === 0 && <p className="text-muted-foreground px-2 py-5 text-center text-sm">Create a tag to organize your notes.</p>}</div></DialogContent></Dialog>;
}
