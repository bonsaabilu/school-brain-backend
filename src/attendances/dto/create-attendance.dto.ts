import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsString,
} from 'class-validator';

import { AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
    @IsString()
    @IsNotEmpty()
    studentId: string;

    @IsString()
    @IsNotEmpty()
    classSubjectId: string;

    @IsDateString()
    date: string;

    @IsEnum(AttendanceStatus)
    status: AttendanceStatus;
}