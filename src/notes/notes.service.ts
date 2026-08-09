import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.note.findMany({
        where: {
            userId
        },
        include: {
            tags: true
        }
    });
  }

  findOne(id: number, userId: number) {
    return this.prisma.note.findUnique({
        where: { id, userId },
        include: {
            tags: true
        }
    })
  }

  async delete(id: number, userId: number) {
    return await this.prisma.note.delete({
        where: { id, userId },
    });
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, userId: number) {
    const { tags, ...noteData } = updateNoteDto;

    return this.prisma.note.update({
        where: { id, userId },
        data: {
            ...noteData,
            ...(tags && {
            tags: {
                set: tags.map(id => ({ id })),
            },
            }),
        },
    });
  }

  async create(createNoteDto: CreateNoteDto, userId: number) {
    const { tags, ...noteData } = createNoteDto;

    if (tags?.length) {
        const userTags = await this.prisma.tag.findMany({
            where: {
                id: {
                    in: tags,
                },
                userId,
            },
            select: {
                id: true,
            },
        });

        if (userTags.length !== tags.length) {
            throw new BadRequestException(
                'One or more tags not found.',
            );
        }
    }

    return this.prisma.note.create({
        data: {
            ...noteData,

            user: {
                connect: {
                    id: userId,
                },
            },

            ...(tags?.length && {
                tags: {
                    connect: tags.map((id) => ({ id })),
                },
            }),
        },
        include: {
            tags: true
        },
    });
    }
}