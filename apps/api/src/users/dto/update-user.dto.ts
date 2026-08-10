import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'New username',
        required: false,
    })
    username!: string
}