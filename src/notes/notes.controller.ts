import { Body, Controller, Get, Post, Param, ParseIntPipe, NotFoundException, Delete, Patch } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Controller({
    path: "notes",
    version: "1"
})
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Get()
  findAll() {
    return this.notesService.findAll();
  }


  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const note = await this.notesService.findOne(id);
    if (!note) {
        throw new NotFoundException()
    }
    return note;
  }

  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.notesService.delete(id)
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() updateNoteDto: UpdateNoteDto) {
    return this.notesService.update(id, updateNoteDto);
  }

  @Post()
  create(@Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(createNoteDto);
  }
}