import {
    IsEnum,
    IsOptional,
} from 'class-validator';

import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;
}