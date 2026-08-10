import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @ApiProperty({
      description: 'Email address of the user',
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
      description: 'Password of the user, at least 8 characters long',
  })
  password!: string;
}