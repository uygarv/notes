import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, NotFoundException, Delete } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Controller({
  path: "tags",
  version: "1"
})
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const tag = await this.tagsService.findOne(id)

    if (!tag) {
      throw new NotFoundException()
    }    

    return tag
  }

  @Patch(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto)
  }

  @Delete(":id")
  async delete(@Param("id", ParseIntPipe) id: number) {
    return this.tagsService.delete(id)
  }
}
