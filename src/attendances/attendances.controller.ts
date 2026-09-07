import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';



import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import { Permission } from '@prisma/client';
import type { User } from '@prisma/client';
import { AttendanceService } from './attendances.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
  ) { }

  @Post()
  @RequirePermissions(
    Permission.ATTENDANCE_CREATE,
  )
  create(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.create(
      dto,
      currentUser,
    );
  }

  @Get()
  @RequirePermissions(
    Permission.ATTENDANCE_READ,
  )
  findAll() {
    return this.attendanceService.findAll();
  }

  @Get('student/:studentId')
  @RequirePermissions(
    Permission.ATTENDANCE_READ,
  )
  findByStudent(
    @Param('studentId') studentId: string,
  ) {
    return this.attendanceService.findByStudent(
      studentId,
    );
  }

  @Get('class-subject/:classSubjectId')
  @RequirePermissions(
    Permission.ATTENDANCE_READ,
  )
  findByClassSubject(
    @Param('classSubjectId')
    classSubjectId: string,
  ) {
    return this.attendanceService.findByClassSubject(
      classSubjectId,
    );
  }

  @Get(':id')
  @RequirePermissions(
    Permission.ATTENDANCE_READ,
  )
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(
    Permission.ATTENDANCE_UPDATE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  @RequirePermissions(
    Permission.ATTENDANCE_DELETE,
  )
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.attendanceService.remove(
      id,
      currentUser,
    );
  }
}