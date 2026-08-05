import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.note.findMany({
        include: {
            tags: true
        }
    });
  }

  findOne(id: number) {
    return this.prisma.note.findUnique({
        where: { id },
        include: {
            tags: true
        }
    })
  }

  async delete(id: number) {
    return await this.prisma.note.delete({
        where: { id },
    });
  }

  async update (id: number, updateNoteDto: UpdateNoteDto) {
    const { tags, ...noteData } = updateNoteDto;

    return this.prisma.note.update({
        where: { id },
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

  async create(createNoteDto: CreateNoteDto) {
    const { tags, ...noteData } = createNoteDto;

    return await this.prisma.note.create({
        data: {
            ...noteData,
            ...(tags && {
                tags: {
                    connect: tags.map((id) => ({id}))
                }
            })
        }
    });
  }
}