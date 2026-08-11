import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { type CreateTag, type UpdateTag } from '@notes/schemas';

@Injectable()
export class TagsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  create(createTag: CreateTag, userId: number) {
    return this.prisma.tag.create({
      data: {
        ...createTag,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  findAll(userId: number) {
    return this.prisma.tag.findMany({
      where: { userId }
    });
  }

  findOne(id: number, userId: number) {
    return this.prisma.tag.findUnique({
      where: { id, userId },
      include: {
        notes: {
          include: {
            tags: true,
          },
        },
      },
    });
  }

  update(id: number, updateTag: UpdateTag, userId: number) {
    return this.prisma.tag.update({
      where: { id, userId },
      data: updateTag,
    })
  }

  delete(id: number, userId: number) {
    return this.prisma.tag.delete({
      where: { id, userId },
    })
  }
}
