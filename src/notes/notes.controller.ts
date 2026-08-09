import { Body, Controller, Get, Post, Param, ParseIntPipe, NotFoundException, Delete, Patch, UseGuards, Request } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller({
    path: "notes",
    version: "1"
})
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Get()
  findAll(@CurrentUserId() userId: number) {
    return this.notesService.findAll(userId);
  }


  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    const note = await this.notesService.findOne(id, userId);
    if (!note) {
        throw new NotFoundException()
    }
    return note;
  }

  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.notesService.delete(id, userId)
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() updateNoteDto: UpdateNoteDto, @CurrentUserId() userId: number) {
    return this.notesService.update(id, updateNoteDto, userId);
  }

  @Post()
  create(@Body() createNoteDto: CreateNoteDto, @CurrentUserId() userId: number) {
    return this.notesService.create(createNoteDto, userId);
  }
}