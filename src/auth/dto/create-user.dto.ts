import {
    IsDateString,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

class ParentInformationDto {
    @IsString()
    @MinLength(2)
    firstName: string;

    @IsString()
    @MinLength(2)
    lastName: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsString()
    relationship: string;
}

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(2)
    firstName: string;

    @IsString()
    @MinLength(2)
    lastName: string;

    @IsEnum(Role)
    role: Role;

    // Student information
    @IsOptional()
    @IsString()
    studentCode?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    // Teacher/Parent information
    @IsOptional()
    @IsString()
    phone?: string;

    // Required when registering a student
    @IsOptional()
    @ValidateNested()
    @Type(() => ParentInformationDto)
    parent?: ParentInformationDto;
}