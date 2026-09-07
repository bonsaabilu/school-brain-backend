import { IsOptional, IsString } from 'class-validator';

export class UpdateClassSubjectDto {
    @IsOptional()
    @IsString()
    teacherId?: string;
}
