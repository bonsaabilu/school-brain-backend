import {
    IsNotEmpty,
    IsString,
} from 'class-validator';

export class CreateEnrollmentDto {
    @IsString()
    @IsNotEmpty()
    studentId: string;

    @IsString()
    @IsNotEmpty()
    classId: string;
}