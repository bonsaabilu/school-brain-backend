import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { EnrollmentService } from './enrollment.service';

import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import { Permission } from '@prisma/client';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EnrollmentController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
  ) { }

  @Post()
  @RequirePermissions(
    Permission.STUDENT_UPDATE,
  )
  create(
    @Body() dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentService.create(dto);
  }

  @Get()
  @RequirePermissions(
    Permission.STUDENT_READ,
  )
  findAll() {
    return this.enrollmentService.findAll();
  }

  @Get('class/:classId')
  @RequirePermissions(
    Permission.STUDENT_READ,
  )
  findByClass(
    @Param('classId') classId: string,
  ) {
    return this.enrollmentService.findByClass(
      classId,
    );
  }

  @Get('student/:studentId')
  @RequirePermissions(
    Permission.STUDENT_READ,
  )
  findByStudent(
    @Param('studentId') studentId: string,
  ) {
    return this.enrollmentService.findByStudent(
      studentId,
    );
  }

  @Get(':id')
  @RequirePermissions(
    Permission.STUDENT_READ,
  )
  findOne(@Param('id') id: string) {
    return this.enrollmentService.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions(
    Permission.STUDENT_UPDATE,
  )
  remove(@Param('id') id: string) {
    return this.enrollmentService.remove(id);
  }
}