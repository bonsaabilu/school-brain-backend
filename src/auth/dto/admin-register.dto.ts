import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

import { Role } from '@prisma/client';

export class AdminRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEnum(Role)
  role: Role;
}
