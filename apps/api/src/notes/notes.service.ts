import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NoteCollaboratorRole, NoteVisibility } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import type {
  AddCollaborator,
  CreateNote,
  CreateShareLink,
  LockNote,
  UnlockNote,
  UpdateCollaborator,
  UpdateNote,
} from '@notes/schemas';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  collaborationStateToHtml,
  createCollaborationState,
} from '../collaboration/document';

const noteInclude = {
  user: { select: { id: true, username: true, profileImageUrl: true } },
  tags: true,
  collaborators: {
    include: { user: { select: { id: true, username: true, profileImageUrl: true } } },
  },
  shareLink: true,
} as const;

type AccessRole = 'owner' | 'editor' | 'viewer';

function toPrismaRole(role: 'viewer' | 'editor') {
  return role === 'editor'
    ? NoteCollaboratorRole.EDITOR
    : NoteCollaboratorRole.VIEWER;
}

function toRole(role: NoteCollaboratorRole): 'viewer' | 'editor' {
  return role === NoteCollaboratorRole.EDITOR ? 'editor' : 'viewer';
}

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  findAll(userId: number) {
    return this.prisma.note.findMany({
      where: { OR: [{ userId }, { collaborators: { some: { userId } } }] },
      include: noteInclude,
    });
  }

  findOne(id: number, userId: number) {
    return this.prisma.note.findFirst({
      where: { id, OR: [{ userId }, { collaborators: { some: { userId } } }] },
      include: noteInclude,
    });
  }

  accessFor(
    note: {
      userId: number;
      collaborators: { userId: number; role: NoteCollaboratorRole }[];
      collaborationState: Uint8Array | null;
    },
    userId: number,
  ) {
    const role: AccessRole =
      note.userId === userId
        ? 'owner'
        : note.collaborators.find(
              (collaborator) => collaborator.userId === userId,
            )?.role === NoteCollaboratorRole.EDITOR
          ? 'editor'
          : 'viewer';
    return {
      role,
      isShared: role !== 'owner',
      isCollaborative: Boolean(note.collaborationState),
    } as const;
  }

  async delete(id: number, userId: number) {
    const note = await this.findOwnerNote(id, userId);
    return this.prisma.note.delete({
      where: { id: note.id },
      include: noteInclude,
    });
  }

  async update(id: number, updateNote: UpdateNote, userId: number) {
    const note = await this.findOne(id, userId);
    if (!note) throw new NotFoundException({ code: 'note_not_found' });
    const access = this.accessFor(note, userId);
    if (access.role === 'viewer')
      throw new NotFoundException({ code: 'note_not_found' });
    if (note.collaborationState && updateNote.content !== undefined) {
      throw new ConflictException({ code: 'collaboration_required' });
    }
    if (access.role !== 'owner' && updateNote.tags !== undefined) {
      throw new NotFoundException({ code: 'note_not_found' });
    }

    const { tags, ...noteData } = updateNote;
    if (tags !== undefined) await this.assertOwnedTags(tags, userId);
    return this.prisma.note.update({
      where: { id: note.id },
      data: {
        ...noteData,
        ...(tags !== undefined && {
          tags: { set: tags.map((tagId) => ({ id: tagId })) },
        }),
      },
      include: noteInclude,
    });
  }

  async create(createNote: CreateNote, userId: number) {
    const { tags, ...noteData } = createNote;
    if (tags !== undefined) await this.assertOwnedTags(tags, userId);
    return this.prisma.note.create({
      data: {
        ...noteData,
        user: { connect: { id: userId } },
        ...(tags?.length && {
          tags: { connect: tags.map((tagId) => ({ id: tagId })) },
        }),
      },
      include: noteInclude,
    });
  }

  async createCollaborationTicket(id: number, userId: number) {
    const note = await this.findOne(id, userId);
    if (!note) throw new NotFoundException({ code: 'note_not_found' });

    const access = this.accessFor(note, userId);
    if (!note.collaborationState || access.role === 'viewer') {
      throw new ConflictException({ code: 'collaboration_required' });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!user) throw new NotFoundException({ code: 'user_not_found' });

    return {
      token: await this.jwtService.signAsync(
        {
          sub: userId,
          tokenVersion: user.tokenVersion,
          noteId: id,
          purpose: 'collaboration',
        },
        { expiresIn: '5m' },
      ),
    };
  }

  async lock(id: number, lockNote: LockNote, userId: number) {
    const note = await this.findOwnerNote(id, userId);
    if (note.shareLink || note.collaborators.length)
      throw new BadRequestException({ code: 'note_not_shareable' });
    return this.prisma.note.update({
      where: { id: note.id },
      data: { ...lockNote, isLocked: true },
      include: noteInclude,
    });
  }

  async unlock(id: number, unlockNote: UnlockNote, userId: number) {
    const note = await this.findOwnerNote(id, userId);
    return this.prisma.note.update({
      where: { id: note.id },
      data: {
        content: unlockNote.content,
        isLocked: false,
        contentEncryptionSalt: null,
        contentEncryptionIv: null,
      },
      include: noteInclude,
    });
  }

  async getSharing(id: number, userId: number) {
    return this.toSharingSettings(await this.findOwnerNote(id, userId));
  }

  async createShareLink(id: number, input: CreateShareLink, userId: number) {
    const note = await this.findOwnerNote(id, userId);
    if (note.isLocked)
      throw new BadRequestException({ code: 'note_not_shareable' });
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (
      input.visibility === 'private' &&
      (!expiresAt || expiresAt <= new Date())
    ) {
      throw new BadRequestException({ code: 'validation_error' });
    }
    const token = randomBytes(32).toString('base64url');
    const updated = await this.prisma.note.update({
      where: { id: note.id },
      data: {
        visibility:
          input.visibility === 'public'
            ? NoteVisibility.PUBLIC
            : NoteVisibility.PRIVATE,
        shareLink: {
          upsert: {
            create: {
              token,
              tokenHash: this.hashToken(token),
              expiresAt: input.visibility === 'public' ? null : expiresAt,
            },
            update: {
              token,
              tokenHash: this.hashToken(token),
              expiresAt: input.visibility === 'public' ? null : expiresAt,
            },
          },
        },
      },
      include: noteInclude,
    });
    return this.toSharingSettings(updated, token);
  }

  async deleteShareLink(id: number, userId: number) {
    const note = await this.findOwnerNote(id, userId);
    const updated = await this.prisma.note.update({
      where: { id: note.id },
      data: { visibility: NoteVisibility.PRIVATE, shareLink: { delete: true } },
      include: noteInclude,
    });
    return this.toSharingSettings(updated);
  }

  async addCollaborator(id: number, input: AddCollaborator, userId: number) {
    const note = await this.findOwnerNote(id, userId);
    if (note.isLocked)
      throw new BadRequestException({ code: 'note_not_shareable' });
    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
      select: { id: true, username: true, profileImageUrl: true },
    });
    if (!user || user.id === userId || !user.username)
      throw new NotFoundException({ code: 'collaborator_not_found' });
    const existing = await this.prisma.noteCollaborator.findUnique({
      where: { noteId_userId: { noteId: id, userId: user.id } },
    });
    if (existing) throw new ConflictException({ code: 'collaborator_exists' });
    const collaborator = await this.prisma.noteCollaborator.create({
      data: {
        noteId: note.id,
        userId: user.id,
        role: toPrismaRole(input.role),
      },
      include: { user: { select: { username: true, profileImageUrl: true } } },
    });
    if (input.role === 'editor' && !note.collaborationState) {
      await this.prisma.note.update({
        where: { id: note.id },
        data: {
          collaborationState: await createCollaborationState(note.content),
        },
      });
    }
    return this.toCollaborator(collaborator);
  }

  async updateCollaborator(
    id: number,
    collaboratorUserId: number,
    input: UpdateCollaborator,
    userId: number,
  ) {
    const note = await this.findOwnerNote(id, userId);
    const collaborator = await this.prisma.noteCollaborator.update({
      where: { noteId_userId: { noteId: id, userId: collaboratorUserId } },
      data: { role: toPrismaRole(input.role) },
      include: { user: { select: { username: true, profileImageUrl: true } } },
    });
    if (input.role === 'editor') {
      await this.prisma.note.updateMany({
        where: { id, collaborationState: null },
        data: {
          collaborationState: await createCollaborationState(note.content),
        },
      });
    } else {
      await this.publishCollaborationAccessRevoked(id, collaboratorUserId, false);
    }
    return this.toCollaborator(collaborator);
  }

  async deleteCollaborator(
    id: number,
    collaboratorUserId: number,
    userId: number,
  ) {
    await this.findOwnerNote(id, userId);
    await this.prisma.noteCollaborator.delete({
      where: { noteId_userId: { noteId: id, userId: collaboratorUserId } },
    });
    await this.publishCollaborationAccessRevoked(id, collaboratorUserId, true);
  }

  private async publishCollaborationAccessRevoked(
    noteId: number,
    userId: number,
    removeNote: boolean,
  ) {
    await this.redisService.publish(
      'notes:collaboration:access-revoked',
      JSON.stringify({ noteId, userId, removeNote }),
    );
  }

  async getShare(token: string, userId?: number) {
    const shareLink = await this.prisma.noteShareLink.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { note: { include: noteInclude } },
    });
    if (!shareLink || shareLink.note.isLocked)
      return { kind: 'unavailable' as const };
    if (shareLink.expiresAt && shareLink.expiresAt <= new Date())
      return { kind: 'expired' as const };
    const note = shareLink.note;
    if (note.visibility === NoteVisibility.PRIVATE) {
      if (!userId) return { kind: 'unauthenticated' as const };
      const allowed =
        note.userId === userId ||
        note.collaborators.some(
          (collaborator) => collaborator.userId === userId,
        );
      if (!allowed) return { kind: 'unavailable' as const };
    }
    return {
      kind: 'ok' as const,
      note: {
        title: note.title,
        content: note.collaborationState
          ? await collaborationStateToHtml(note.collaborationState)
          : note.content,
        updatedAt: note.updatedAt.toISOString(),
        visibility:
          note.visibility === NoteVisibility.PUBLIC
            ? ('public' as const)
            : ('private' as const),
        expiresAt: shareLink.expiresAt?.toISOString() ?? null,
      },
    };
  }

  private async findOwnerNote(id: number, userId: number) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId },
      include: noteInclude,
    });
    if (!note) throw new NotFoundException({ code: 'note_not_found' });
    return note;
  }

  private async assertOwnedTags(tagIds: number[], userId: number) {
    if (!tagIds.length) return;
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    });
    if (tags.length !== tagIds.length)
      throw new BadRequestException({ code: 'tags_not_found' });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toCollaborator(collaborator: {
    userId: number;
    role: NoteCollaboratorRole;
    createdAt: Date;
    user: { username: string | null; profileImageUrl: string | null };
  }) {
    return {
      userId: collaborator.userId,
      username: collaborator.user.username ?? 'Notes user',
      profileImageUrl: collaborator.user.profileImageUrl,
      role: toRole(collaborator.role),
      createdAt: collaborator.createdAt.toISOString(),
    };
  }

  private toSharingSettings(
    note: Awaited<ReturnType<NotesService['findOwnerNote']>>,
    rawToken?: string,
  ) {
    const link = note.shareLink
      ? {
          ...((rawToken ?? note.shareLink.token)
            ? {
                url: `${(process.env.WEB_URL ?? 'http://localhost:3001').replace(/\/$/, '')}/share/${rawToken ?? note.shareLink.token}`,
              }
            : {}),
          visibility:
            note.visibility === NoteVisibility.PUBLIC
              ? ('public' as const)
              : ('private' as const),
          expiresAt: note.shareLink.expiresAt?.toISOString() ?? null,
          createdAt: note.shareLink.createdAt.toISOString(),
        }
      : null;
    return {
      visibility:
        note.visibility === NoteVisibility.PUBLIC
          ? ('public' as const)
          : ('private' as const),
      link,
      collaborators: note.collaborators.map((collaborator) =>
        this.toCollaborator(collaborator),
      ),
    };
  }
}
