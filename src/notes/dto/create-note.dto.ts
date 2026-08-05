import { IsInt, IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateNoteDto {
    @IsNotEmpty()
    @IsString()
    title!: string;

    @IsNotEmpty()
    @IsString()
    content!: string;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    tags?: number[];
}