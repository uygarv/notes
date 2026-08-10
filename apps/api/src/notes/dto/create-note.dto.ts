import { IsInt, IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
    @ApiProperty({
        description: 'The title of the note',
    })
    @IsNotEmpty()
    @IsString()
    title!: string;

    @ApiProperty({
        description: 'The content of the note',
    })
    @IsNotEmpty()
    @IsString()
    content!: string;

    @ApiProperty({
        description: 'The tags associated with the note',
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    tags?: number[];
}