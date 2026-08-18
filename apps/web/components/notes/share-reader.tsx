'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clipboard,
  Download,
  FileText,
  LoaderCircle,
  Printer,
  Share2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RichTextEditor } from '@/components/notes/rich-text-editor';
import { ApiError } from '@/lib/api';
import { useSharedNote } from '@/lib/queries';
import { formatApiError, toPlainText } from '@/lib/utils';

function fileName(title: string) {
  return (
    title
      .trim()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-|-$/g, '') || 'shared-note'
  );
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ShareReader({ token }: { token: string }) {
  const router = useRouter();
  const shared = useSharedNote(token);

  useEffect(() => {
    if (shared.error instanceof ApiError && shared.error.status === 401) {
      router.replace(`/login?next=${encodeURIComponent(`/share/${token}`)}`);
    }
  }, [router, shared.error, token]);

  if (
    shared.isPending ||
    (shared.error instanceof ApiError && shared.error.status === 401)
  ) {
    return (
      <main className="grid min-h-svh place-items-center bg-background">
        <LoaderCircle className="text-muted-foreground size-5 animate-spin" />
      </main>
    );
  }

  if (shared.error || !shared.data) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <div className="w-full max-w-sm text-center">
          <div className="bg-muted mx-auto flex size-10 items-center justify-center rounded-lg">
            <Share2 className="size-4" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">
            This share is unavailable
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {formatApiError(shared.error)}
          </p>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() => router.push('/login')}
          >
            Sign in to Notes
          </Button>
        </div>
      </main>
    );
  }

  const note = shared.data;
  const plainText = toPlainText(note.content);
  const safeName = fileName(note.title);
  return (
    <main className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
            <FileText className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold">Notes</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigator.clipboard.writeText(plainText)}
          >
            <Clipboard />
            Copy text
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() =>
                  download(
                    `${safeName}.txt`,
                    plainText,
                    'text/plain;charset=utf-8',
                  )
                }
              >
                <FileText />
                Plain text
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  download(
                    `${safeName}.html`,
                    `<!doctype html><meta charset="utf-8"><title>${note.title}</title><h1>${note.title}</h1>${note.content}`,
                    'text/html;charset=utf-8',
                  )
                }
              >
                <Download />
                HTML
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.print()}>
                <Printer />
                Print / Save PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <article className="mx-auto flex w-full max-w-4xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-muted-foreground text-xs">
          {note.visibility === 'public'
            ? 'Public read-only share'
            : 'Private read-only share'}{' '}
          · Updated {new Date(note.updatedAt).toLocaleString()}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {note.title}
        </h1>
        <div className="mt-7 min-h-[20rem]">
          <RichTextEditor
            content={note.content}
            onChange={() => undefined}
            editable={false}
            showToolbar={false}
          />
        </div>
      </article>
    </main>
  );
}
