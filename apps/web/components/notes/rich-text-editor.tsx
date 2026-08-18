'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import * as Y from 'yjs';
import {
  Bold,
  Check,
  ChevronDown,
  Code2,
  Columns2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Merge,
  Quote,
  Redo2,
  Rows2,
  Split,
  Strikethrough,
  Table2,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ApiError, api, unwrap } from '@/lib/api';
import { collaborationTicketSchema } from '@notes/schemas';

type RichTextEditorProps = {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  showToolbar?: boolean;
  collaboration?: {
    noteId: number;
    user: { id: number; name: string; color: string; profileImageUrl?: string | null };
    showUsernames?: boolean;
    onPresenceChange?: (users: { id: number; name: string; profileImageUrl?: string | null }[]) => void;
    onAccessRevoked?: (removeNote: boolean) => void;
    onLiveStatusChange?: (isLive: boolean) => void;
  };
};

type CollaborationConnection = {
  document: Y.Doc;
  provider: HocuspocusProvider;
  websocketProvider: HocuspocusProviderWebsocket;
};

type BlockStyle =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'monostyled'
  | 'bullet'
  | 'dashed'
  | 'numbered'
  | 'quote';

const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'bullet',
        parseHTML: (element) =>
          element.getAttribute('data-list-style') ?? 'bullet',
        renderHTML: (attributes) => ({
          'data-list-style': attributes.listStyle,
        }),
      },
    };
  },
});

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  showToolbar = editable,
  collaboration,
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const selectionBeforeLinkDialog = useRef<{ from: number; to: number } | null>(
    null,
  );
  const pendingCollaborationCleanup = useRef<{
    connection: CollaborationConnection;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const remoteUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collaborationSynced, setCollaborationSynced] = useState(false);
  const [showCollaborationStatus, setShowCollaborationStatus] = useState(false);
  const [showCollaborationGutter, setShowCollaborationGutter] =
    useState(false);
  const collaborationNoteId = collaboration?.noteId;
  const collaborationUser = collaboration?.user;
  const showCollaboratorNames = collaboration?.showUsernames ?? true;
  const onPresenceChange = collaboration?.onPresenceChange;
  const onAccessRevoked = collaboration?.onAccessRevoked;
  const onLiveStatusChange = collaboration?.onLiveStatusChange;
  const collaborationConnection = useMemo(() => {
    if (!collaborationNoteId) return null;
    const document = new Y.Doc();
    const url = process.env.NEXT_PUBLIC_COLLAB_URL ?? 'ws://localhost:3002';
    const websocketProvider = new HocuspocusProviderWebsocket({
      url,
      autoConnect: false,
    });
    const reportPresence = (
      states: { clientId: number; user?: Record<string, unknown> }[],
    ) => {
      const users = states.flatMap((state) => {
        if (state.clientId === document.clientID) return [];
        const user = state.user;
        return user &&
          typeof user.id === 'number' &&
          typeof user.name === 'string'
          ? [
              {
                id: user.id,
                name: user.name,
                profileImageUrl:
                  typeof user.profileImageUrl === 'string'
                    ? user.profileImageUrl
                    : null,
              },
            ]
          : [];
      });
      onPresenceChange?.(users);
    };
    const provider = new HocuspocusProvider({
      name: `note:${collaborationNoteId}`,
      document,
      websocketProvider,
      token: async () => {
        try {
          const response = await api.notes.createCollaborationTicket({
            params: { id: collaborationNoteId },
          });
          return collaborationTicketSchema.parse(unwrap(response)).token;
        } catch (error) {
          if (
            error instanceof ApiError &&
            [403, 404, 409].includes(error.status)
          ) {
            onAccessRevoked?.(true);
          }
          throw error;
        }
      },
      sessionAwareness: true,
      flushDelay: 100,
      onSynced: ({ state }) => {
        setCollaborationSynced(state);
        if (state) onLiveStatusChange?.(true);
      },
      onStateless: ({ payload }) => {
        try {
          const message = JSON.parse(payload) as {
            type?: unknown;
            removeNote?: unknown;
          };
          if (message.type === 'access-revoked') {
            onAccessRevoked?.(message.removeNote === true);
          }
        } catch {
          // Ignore stateless messages that do not belong to this client.
        }
      },
      onAwarenessUpdate: ({ states }) => reportPresence(states),
      onAwarenessChange: ({ states }) => reportPresence(states),
    });
    document.on('update', (_update, origin) => {
      if (origin !== provider || !editorRef.current) return;
      requestAnimationFrame(() => {
        const blocks = editorRef.current?.view.dom.querySelectorAll(
          'p, h1, h2, h3, li, blockquote',
        );
        if (!blocks) return;
        blocks.forEach((block) => block.classList.remove('remote-text-update'));
        void editorRef.current?.view.dom.offsetWidth;
        blocks.forEach((block) => block.classList.add('remote-text-update'));
        if (remoteUpdateTimer.current) clearTimeout(remoteUpdateTimer.current);
        remoteUpdateTimer.current = setTimeout(() => {
          blocks.forEach((block) => block.classList.remove('remote-text-update'));
        }, 360);
      });
    });
    return { document, provider, websocketProvider };
  }, [
    collaborationNoteId,
    onAccessRevoked,
    onLiveStatusChange,
    onPresenceChange,
  ]);

  useEffect(() => {
    if (!collaborationConnection || !collaborationUser) return;
    const pendingCleanup = pendingCollaborationCleanup.current;
    if (pendingCleanup?.connection === collaborationConnection) {
      clearTimeout(pendingCleanup.timeout);
      pendingCollaborationCleanup.current = null;
    }
    collaborationConnection.provider.attach();
    collaborationConnection.provider.setAwarenessField(
      'user',
      collaborationUser,
    );
    const connectTimeout = window.setTimeout(() => {
      void collaborationConnection.websocketProvider.connect();
    }, 0);
    return () => {
      window.clearTimeout(connectTimeout);
      const connection = collaborationConnection;
      const timeout = setTimeout(() => {
        connection.provider.destroy();
        connection.websocketProvider.destroy();
        connection.document.destroy();
        if (pendingCollaborationCleanup.current?.connection === connection)
          pendingCollaborationCleanup.current = null;
      }, 0);
      pendingCollaborationCleanup.current = { connection, timeout };
    };
  }, [
    collaborationConnection,
    collaborationUser,
    onLiveStatusChange,
    onPresenceChange,
  ]);

  useEffect(() => {
    if (collaborationConnection) return;
    onPresenceChange?.([]);
    onLiveStatusChange?.(false);
  }, [collaborationConnection, onLiveStatusChange, onPresenceChange]);

  useEffect(() => {
    if (!collaborationConnection || collaborationSynced) {
      setShowCollaborationStatus(false);
      return;
    }
    const timer = window.setTimeout(
      () => setShowCollaborationStatus(true),
      2_000,
    );
    return () => window.clearTimeout(timer);
  }, [collaborationConnection, collaborationSynced]);

  useEffect(() => {
    if (!collaborationConnection) {
      setShowCollaborationGutter(false);
      return;
    }
    let secondFrame: number | null = null;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setShowCollaborationGutter(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, [collaborationConnection]);
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        undoRedo: collaborationConnection ? false : undefined,
        bulletList: false,
        link: false,
        underline: false,
      }),
      StyledBulletList,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https://',
      }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ...(collaborationConnection
        ? [
            Collaboration.configure({
              document: collaborationConnection.document,
              field: 'default',
            }),
            CollaborationCaret.configure({
              provider: collaborationConnection.provider,
              user: {
                name: collaborationUser?.name ?? 'Editor',
                color: collaborationUser?.color ?? 'var(--primary)',
                profileImageUrl: collaborationUser?.profileImageUrl ?? null,
              },
              render: (user) => {
                const caret = document.createElement('span');
                caret.classList.add('collaboration-caret');
                caret.style.setProperty('--collaborator-color', user.color);

                const badge = document.createElement('span');
                badge.classList.add('collaboration-caret__badge');
                badge.style.visibility = 'hidden';

                const avatar = user.profileImageUrl
                  ? document.createElement('img')
                  : document.createElement('span');
                avatar.classList.add('collaboration-caret__avatar');
                if (avatar instanceof HTMLImageElement) {
                  avatar.src = String(user.profileImageUrl);
                  avatar.alt = '';
                } else {
                  avatar.textContent = String(user.name ?? 'E')
                    .trim()
                    .slice(0, 2)
                    .toUpperCase();
                }

                const name = document.createElement('span');
                name.classList.add('collaboration-caret__name');
                name.textContent = String(user.name ?? 'Editor');

                badge.append(avatar, name);
                caret.append(badge);
                return caret;
              },
              selectionRender: (user) => ({
                class: 'collaboration-caret__selection',
                style: `--collaborator-color: ${user.color}`,
              }),
            }),
          ]
        : []),
    ],
    content: collaborationConnection ? undefined : content,
    editorProps: {
      attributes: {
        class: 'notes-prose min-h-[28rem] flex-1 px-0 pb-2 outline-none',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => onChange(updatedEditor.getHTML()),
  }, [collaborationConnection]);

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      if (editorRef.current === editor) editorRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    let frame: number | null = null;
    const positionBadges = () => {
      frame = null;
      root.querySelectorAll<HTMLElement>('.collaboration-caret').forEach(
        (caret) => {
          const badge = caret.querySelector<HTMLElement>(
            '.collaboration-caret__badge',
          );
          if (!badge) return;
          const caretRect = caret.getBoundingClientRect();
          const badgeRect = badge.getBoundingClientRect();
          const containingRect = badge.offsetParent?.getBoundingClientRect();
          const offsetLeft = containingRect?.left ?? 0;
          const offsetTop = containingRect?.top ?? 0;
          badge.style.left = `${Math.max(
            8,
            Math.min(
              caretRect.left - offsetLeft,
              window.innerWidth - offsetLeft - badgeRect.width - 8,
            ),
          )}px`;
          badge.style.top = `${Math.max(
            8,
            caretRect.top - offsetTop - badgeRect.height - 8,
          )}px`;
          badge.style.visibility = 'visible';
        },
      );
    };
    const scheduleBadgePositioning = () => {
      if (frame === null) frame = requestAnimationFrame(positionBadges);
    };
    const observer = new MutationObserver(scheduleBadgePositioning);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleBadgePositioning);
    document.addEventListener('scroll', scheduleBadgePositioning, true);
    scheduleBadgePositioning();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleBadgePositioning);
      document.removeEventListener('scroll', scheduleBadgePositioning, true);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [editor]);

  // Keep formatting controls in sync with caret and selection changes, not only document edits.
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  });

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    selectionBeforeLinkDialog.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    setLinkUrl((editor.getAttributes('link').href as string | undefined) ?? '');
    setLinkDialogOpen(true);
  }, [editor]);

  const saveLink = useCallback(() => {
    if (!editor) return;
    const value = linkUrl.trim();
    const chain = editor.chain().focus();
    if (selectionBeforeLinkDialog.current)
      chain.setTextSelection(selectionBeforeLinkDialog.current);
    if (!value) {
      chain.extendMarkRange('link').unsetLink().run();
    } else {
      const href = /^(https?:\/\/|mailto:|tel:)/i.test(value)
        ? value
        : `https://${value}`;
      chain.extendMarkRange('link').setLink({ href }).run();
    }
    setLinkDialogOpen(false);
  }, [editor, linkUrl]);

  if (!editor)
    return <div className="bg-muted/50 h-[28rem] animate-pulse rounded-md" />;

  const isWaitingForCollaboration = Boolean(
    collaborationConnection && !collaborationSynced,
  );

  return (
    <div
      className={`rich-text-editor flex min-h-0 flex-1 flex-col ${showCollaboratorNames ? '' : 'hide-collaborator-names'} ${showCollaborationGutter ? 'show-collaboration-gutter' : ''}`}
    >
      {showToolbar && !isWaitingForCollaboration && (
        <div className="editor-toolbar bg-background/95 sticky top-14 z-10 -mx-1 flex flex-wrap items-center gap-x-0.5 gap-y-1 border-b py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="editor-toolbar__format flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
            <BlockStyleMenu editor={editor} />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <EditorButton
              label="Bold"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold />
            </EditorButton>
            <EditorButton
              label="Italic"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic />
            </EditorButton>
            <EditorButton
              label="Underline"
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon />
            </EditorButton>
            <EditorButton
              label="Strike through"
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough />
            </EditorButton>
            <EditorButton
              label="Inline code"
              active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code2 />
            </EditorButton>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <EditorButton
              label="Checklist"
              active={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <ListChecks />
            </EditorButton>
            <TableControls editor={editor} />
            <EditorButton
              label="Add link"
              active={editor.isActive('link')}
              onClick={openLinkDialog}
            >
              <Link2 />
            </EditorButton>
          </div>
          <div className="editor-toolbar__history ml-auto flex shrink-0 items-center gap-0.5">
            <EditorButton
              label="Undo"
              disabled={!editor.can().chain().focus().undo().run()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 />
            </EditorButton>
            <EditorButton
              label="Redo"
              disabled={!editor.can().chain().focus().redo().run()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 />
            </EditorButton>
          </div>
        </div>
      )}
      {isWaitingForCollaboration ? (
        <div
          className="notes-prose min-h-[28rem] flex-1 px-0 py-2"
          aria-live="polite"
        >
          {showCollaborationStatus && (
            <div className="collaboration-status text-muted-foreground mb-3 flex items-center gap-2 text-xs">
              <span className="bg-primary size-1.5 animate-pulse rounded-full" />
              Connecting to the live editor…
            </div>
          )}
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      ) : (
        <EditorContent
          editor={editor}
          className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden"
        />
      )}
      {showToolbar && (
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editor.isActive('link') ? 'Edit link' : 'Add link'}
              </DialogTitle>
              <DialogDescription>
                Paste a URL for the selected text. Leave it blank to remove the
                link.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveLink();
              }}
            >
              <div className="space-y-2">
                <label htmlFor="note-link-url" className="text-sm font-medium">
                  URL
                </label>
                <Input
                  id="note-link-url"
                  autoFocus
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://example.com"
                  inputMode="url"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLinkDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save link</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function BlockStyleMenu({ editor }: { editor: Editor }) {
  const currentStyle = getCurrentBlockStyle(editor);
  const shouldRestoreFocus = useRef(false);

  function applyStyle(style: BlockStyle) {
    shouldRestoreFocus.current = true;
    if (style === 'title')
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    if (style === 'heading')
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (style === 'subheading')
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    if (style === 'body') editor.chain().focus().setParagraph().run();
    if (style === 'monostyled') editor.chain().focus().toggleCodeBlock().run();
    if (style === 'numbered') editor.chain().focus().toggleOrderedList().run();
    if (style === 'quote') editor.chain().focus().toggleBlockquote().run();
    if (style === 'bullet' || style === 'dashed') {
      if (!editor.isActive('bulletList'))
        editor.chain().focus().toggleBulletList().run();
      editor
        .chain()
        .focus()
        .updateAttributes('bulletList', {
          listStyle: style === 'dashed' ? 'dash' : 'bullet',
        })
        .run();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2"
          aria-label="Change text style"
        >
          <Type className="size-4" />
          <span className="hidden text-xs sm:inline">{currentStyle.label}</span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-48"
        onCloseAutoFocus={(event) => {
          if (!shouldRestoreFocus.current) return;
          event.preventDefault();
          shouldRestoreFocus.current = false;
          requestAnimationFrame(() => editor.commands.focus());
        }}
      >
        <BlockStyleItem
          active={currentStyle.id === 'title'}
          icon={<Heading1 />}
          label="Title"
          onSelect={() => applyStyle('title')}
        />
        <BlockStyleItem
          active={currentStyle.id === 'heading'}
          icon={<Heading2 />}
          label="Heading"
          onSelect={() => applyStyle('heading')}
        />
        <BlockStyleItem
          active={currentStyle.id === 'subheading'}
          icon={<Heading3 />}
          label="Subheading"
          onSelect={() => applyStyle('subheading')}
        />
        <BlockStyleItem
          active={currentStyle.id === 'body'}
          icon={<Type />}
          label="Body"
          onSelect={() => applyStyle('body')}
        />
        <BlockStyleItem
          active={currentStyle.id === 'monostyled'}
          icon={<Code2 />}
          label="Monostyled"
          onSelect={() => applyStyle('monostyled')}
        />
        <Separator className="my-1" />
        <BlockStyleItem
          active={currentStyle.id === 'bullet'}
          icon={<List />}
          label="Bulleted list"
          onSelect={() => applyStyle('bullet')}
        />
        <BlockStyleItem
          active={currentStyle.id === 'dashed'}
          icon={<List />}
          label="Dashed list"
          onSelect={() => applyStyle('dashed')}
        />
        <BlockStyleItem
          active={currentStyle.id === 'numbered'}
          icon={<ListOrdered />}
          label="Numbered list"
          onSelect={() => applyStyle('numbered')}
        />
        <Separator className="my-1" />
        <BlockStyleItem
          active={currentStyle.id === 'quote'}
          icon={<Quote />}
          label="Block quote"
          onSelect={() => applyStyle('quote')}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableControls({ editor }: { editor: Editor }) {
  const tableState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      try {
        if (!currentEditor || currentEditor.isDestroyed)
          return { active: false, canMerge: false, canSplit: false };
        return {
          active: currentEditor.isActive('table'),
          canMerge: currentEditor.can().chain().focus().mergeCells().run(),
          canSplit: currentEditor.can().chain().focus().splitCell().run(),
        };
      } catch {
        return { active: false, canMerge: false, canSplit: false };
      }
    },
  });

  if (!tableState.active) {
    return (
      <EditorButton
        label="Insert 3 by 3 table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <Table2 />
      </EditorButton>
    );
  }

  const run = (command: () => boolean) => command();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 gap-1 px-2"
          aria-label="Edit table"
        >
          <Table2 className="size-3.5" />
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem
          onSelect={() =>
            run(() => editor.chain().focus().addRowBefore().run())
          }
        >
          <Rows2 />
          Add row above
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => run(() => editor.chain().focus().addRowAfter().run())}
        >
          <Rows2 />
          Add row below
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => run(() => editor.chain().focus().deleteRow().run())}
        >
          <Trash2 />
          Delete row
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            run(() => editor.chain().focus().addColumnBefore().run())
          }
        >
          <Columns2 />
          Add column left
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(() => editor.chain().focus().addColumnAfter().run())
          }
        >
          <Columns2 />
          Add column right
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(() => editor.chain().focus().deleteColumn().run())
          }
        >
          <Trash2 />
          Delete column
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            run(() => editor.chain().focus().toggleHeaderRow().run())
          }
        >
          <Heading1 />
          Toggle header row
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!tableState.canMerge}
          onSelect={() => run(() => editor.chain().focus().mergeCells().run())}
        >
          <Merge />
          Merge cells
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!tableState.canSplit}
          onSelect={() => run(() => editor.chain().focus().splitCell().run())}
        >
          <Split />
          Split cell
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => run(() => editor.chain().focus().deleteTable().run())}
        >
          <Trash2 />
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BlockStyleItem({
  active,
  icon,
  label,
  onSelect,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect}>
      {active ? <Check /> : icon}
      <span>{label}</span>
    </DropdownMenuItem>
  );
}

function getCurrentBlockStyle(editor: Editor) {
  if (editor.isActive('heading', { level: 1 }))
    return { id: 'title', label: 'Title' };
  if (editor.isActive('heading', { level: 2 }))
    return { id: 'heading', label: 'Heading' };
  if (editor.isActive('heading', { level: 3 }))
    return { id: 'subheading', label: 'Subheading' };
  if (editor.isActive('codeBlock'))
    return { id: 'monostyled', label: 'Monostyled' };
  if (editor.isActive('bulletList', { listStyle: 'dash' }))
    return { id: 'dashed', label: 'Dashed list' };
  if (editor.isActive('bulletList'))
    return { id: 'bullet', label: 'Bulleted list' };
  if (editor.isActive('orderedList'))
    return { id: 'numbered', label: 'Numbered list' };
  if (editor.isActive('blockquote'))
    return { id: 'quote', label: 'Block quote' };
  return { id: 'body', label: 'Body' };
}

function EditorButton({
  label,
  active,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; active?: boolean }) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      className={cn('size-7 shrink-0 [&_svg]:size-3.5', className)}
      aria-label={label}
      aria-pressed={active}
      {...props}
    />
  );
}
