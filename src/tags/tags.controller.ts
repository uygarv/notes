import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, NotFoundException, Delete, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard("jwt"))
@Controller({
  path: "tags",
  version: "1"
})
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  create(@Body() createTagDto: CreateTagDto, @CurrentUserId() userId: number) {
    return this.tagsService.create(createTagDto, userId);
  }

  @Get()
  findAll(@CurrentUserId() userId: number) {
    return this.tagsService.findAll(userId);
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    const tag = await this.tagsService.findOne(id, userId)

    if (!tag) {
      throw new NotFoundException()
    }    

    return tag
  }

  @Patch(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() updateTagDto: UpdateTagDto, @CurrentUserId() userId: number) {
    return this.tagsService.update(id, updateTagDto, userId)
  }

  @Delete(":id")
  async delete(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.tagsService.delete(id, userId)
  }
}
