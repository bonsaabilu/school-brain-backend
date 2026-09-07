import {
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class UpdateGradeDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    score?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    maxScore?: number;

    @IsOptional()
    @IsString()
    term?: string;
}