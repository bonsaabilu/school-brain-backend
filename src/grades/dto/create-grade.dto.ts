import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateGradeDto {
    @IsString()
    @IsNotEmpty()
    studentId: string;

    @IsString()
    @IsNotEmpty()
    classSubjectId: string;

    @IsNumber()
    @Min(0)
    score: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    maxScore?: number;

    @IsString()
    @IsNotEmpty()
    term: string;
}