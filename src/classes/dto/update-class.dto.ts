import {
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class UpdateClassDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    academicYear?: string;

    @IsOptional()
    @IsString()
    teacherId?: string;
}