import { config } from 'dotenv';
import { JwtService } from '@nestjs/jwt';
import { Server } from '@hocuspocus/server';
import { PrismaClient, NoteCollaboratorRole } from '@prisma/client';
import Redis from 'ioredis';
import * as Y from 'yjs';
import {
  createCollaborationState,
  collaborationStateToHtml,
  isEmptyCollaborationState,
} from './document';

config({ path: ['.env.local', '.env'], quiet: true });

type CollaborationContext = {
  userId: number;
  role: 'owner' | 'editor';
  name: string;
  profileImageUrl: string | null;
};

type CollaborationPresenceDocument = {
  getConnections(): {
    context: CollaborationContext;
    sessionId: string | null;
  }[];
  broadcastStateless(payload: string): void;
};

const prisma = new PrismaClient();
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error('REDIS_URL is not defined');
const accessRevocationSubscriber = new Redis(redisUrl);

function broadcastPresence(document: CollaborationPresenceDocument) {
  const users = document
    .getConnections()
    .flatMap((connection) =>
      connection.sessionId
        ? [
            {
              sessionId: connection.sessionId,
              id: connection.context.userId,
              name: connection.context.name,
              profileImageUrl: connection.context.profileImageUrl,
            },
          ]
        : [],
    );
  document.broadcastStateless(
    JSON.stringify({ type: 'collaboration-presence', users }),
  );
}

function parseNoteId(documentName: string) {
  const match = /^note:(\d+)$/.exec(documentName);
  return match ? Number(match[1]) : null;
}

function cookieValue(cookieHeader: string | null, name: string) {
  return cookieHeader
    ?.split(';')
    .map((value) => value.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

async function authenticate(
  documentName: string,
  headers: Headers,
  collaborationTicket?: string,
): Promise<CollaborationContext> {
  const noteId = parseNoteId(documentName);
  if (!noteId) throw new Error('invalid-document');
  const origin = headers.get('origin');
  const webUrl = (process.env.WEB_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  if (origin && origin !== webUrl)
    throw new Error('origin-not-allowed');

  const token =
    collaborationTicket ??
    cookieValue(headers.get('cookie'), 'notes_access_token');
  if (!token) throw new Error('authentication-required');
  const payload = await jwt.verifyAsync<{
    sub: number;
    tokenVersion?: number;
    noteId?: number;
    purpose?: string;
  }>(token);
  if (
    collaborationTicket &&
    (payload.purpose !== 'collaboration' || payload.noteId !== noteId)
  ) {
    throw new Error('invalid-collaboration-ticket');
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { tokenVersion: true, username: true, profileImageUrl: true },
  });
  if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0))
    throw new Error('session-expired');

  const identity = {
    userId: payload.sub,
    name: user.username ?? 'Notes user',
    profileImageUrl: user.profileImageUrl,
  };

  const note = await prisma.note.findFirst({
    where: { id: noteId },
    select: {
      userId: true,
      collaborators: { where: { userId: payload.sub }, select: { role: true } },
    },
  });
  if (!note) throw new Error('note-unavailable');
  if (note.userId === payload.sub)
    return { ...identity, role: 'owner' };
  if (note.collaborators[0]?.role === NoteCollaboratorRole.EDITOR)
    return { ...identity, role: 'editor' };
  throw new Error('editor-access-required');
}

async function assertEditorAccess(
  documentName: string,
  context: CollaborationContext,
) {
  const noteId = parseNoteId(documentName);
  if (!noteId) throw new Error('Invalid document.');
  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
      OR: [
        { userId: context.userId },
        {
          collaborators: {
            some: { userId: context.userId, role: NoteCollaboratorRole.EDITOR },
          },
        },
      ],
    },
    select: { id: true },
  });
  if (!note) throw new Error('Editor access has been removed.');
}

const server = new Server<CollaborationContext>({
  port: Number(process.env.COLLAB_PORT ?? 3002),
  quiet: true,
  debounce: 750,
  maxDebounce: 2_000,
  flushDelay: false,
  async onAuthenticate({ documentName, requestHeaders, token }) {
    return authenticate(documentName, requestHeaders, token);
  },
  async beforeSync({ documentName, context, type }) {
    if (type === 2) await assertEditorAccess(documentName, context);
  },
  async connected({ connection }) {
    broadcastPresence(connection.document);
  },
  async onDisconnect({ document }) {
    broadcastPresence(document);
  },
  async onLoadDocument({ documentName }) {
    const noteId = parseNoteId(documentName);
    if (!noteId) throw new Error('Invalid document.');
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { collaborationState: true, content: true },
    });
    if (!note) throw new Error('Note unavailable.');
    if (!note.collaborationState?.length) return new Y.Doc();
    if (isEmptyCollaborationState(note.collaborationState)) {
      const collaborationState = await createCollaborationState(note.content);
      await prisma.note.update({
        where: { id: noteId },
        data: { collaborationState },
      });
      return new Uint8Array(collaborationState);
    }
    return new Uint8Array(note.collaborationState);
  },
  async onStoreDocument({ documentName, document }) {
    const noteId = parseNoteId(documentName);
    if (!noteId) return;
    const collaborationState = Buffer.from(Y.encodeStateAsUpdate(document));
    await prisma.note.update({
      where: { id: noteId },
      data: {
        collaborationState,
        content: await collaborationStateToHtml(collaborationState),
      },
    });
  },
});

void accessRevocationSubscriber.subscribe('notes:collaboration:access-revoked');
accessRevocationSubscriber.on('message', (_channel, message) => {
  try {
    const { noteId, userId, removeNote } = JSON.parse(message) as {
      noteId?: unknown;
      userId?: unknown;
      removeNote?: unknown;
    };
    if (!Number.isInteger(noteId) || !Number.isInteger(userId)) return;
    const document = server.hocuspocus.documents.get(`note:${noteId}`);
    document?.broadcastStateless(
      JSON.stringify({ type: 'access-revoked', removeNote: removeNote === true }),
      (connection) => connection.context.userId === userId,
    );
  } catch {
    // Ignore malformed notifications from outside this application.
  }
});

void server.listen().catch(async (error) => {
  await prisma.$disconnect();
  throw error;
});

async function shutdown() {
  await server.destroy();
  await accessRevocationSubscriber.quit();
  await prisma.$disconnect();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
