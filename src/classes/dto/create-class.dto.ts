import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class CreateClassDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @IsString()
    @IsNotEmpty()
    academicYear: string;

    @IsOptional()
    @IsString()
    teacherId?: string;
}