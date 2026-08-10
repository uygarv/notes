import { Injectable } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  create(createTagDto: CreateTagDto, userId: number) {
    return this.prisma.tag.create({
      data: {
        ...createTagDto,
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
        "notes": true
      }
    })
  }

  update(id: number, updateTagDto: UpdateTagDto, userId: number) {
    return this.prisma.tag.update({
      where: { id, userId },
      data: updateTagDto,
    })
  }

  delete(id: number, userId: number) {
    return this.prisma.tag.delete({
      where: { id, userId },
    })
  }
}
