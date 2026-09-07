import {
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateClassSubjectDto {
    @IsString()
    @IsNotEmpty()
    classId: string;

    @IsString()
    @IsNotEmpty()
    subjectId: string;

    @IsOptional()
    @IsString()
    teacherId?: string;
}