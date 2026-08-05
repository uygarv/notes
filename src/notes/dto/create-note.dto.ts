import { IsInt, IsNotEmpty, IsString, IsArray } from 'class-validator';

export class CreateNoteDto {
    @IsNotEmpty()
    @IsString()
    title!: string;

    @IsNotEmpty()
    @IsString()
    content!: string;

    @IsArray()
    @IsInt({ each: true })
    tags!: number[];
}