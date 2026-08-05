import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTagDto {
    @IsNotEmpty()
    @IsString()
    name!: string;
}