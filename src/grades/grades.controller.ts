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

import { GradeService } from './grades.service';

import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import { Permission } from '@prisma/client';
import type { User } from '@prisma/client';

@Controller('grades')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GradeController {
  constructor(
    private readonly gradeService: GradeService,
  ) { }

  @Post()
  @RequirePermissions(
    Permission.GRADE_CREATE,
  )
  create(
    @Body() dto: CreateGradeDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.gradeService.create(
      dto,
      currentUser,
    );
  }

  @Get()
  @RequirePermissions(
    Permission.GRADE_READ,
  )
  findAll() {
    return this.gradeService.findAll();
  }

  @Get('student/:studentId')
  @RequirePermissions(
    Permission.GRADE_READ,
  )
  findByStudent(
    @Param('studentId') studentId: string,
  ) {
    return this.gradeService.findByStudent(
      studentId,
    );
  }

  @Get('class-subject/:classSubjectId')
  @RequirePermissions(
    Permission.GRADE_READ,
  )
  findByClassSubject(
    @Param('classSubjectId')
    classSubjectId: string,
  ) {
    return this.gradeService.findByClassSubject(
      classSubjectId,
    );
  }

  @Get(':id')
  @RequirePermissions(
    Permission.GRADE_READ,
  )
  findOne(@Param('id') id: string) {
    return this.gradeService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(
    Permission.GRADE_UPDATE,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.gradeService.update(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  @RequirePermissions(
    Permission.GRADE_DELETE,
  )
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.gradeService.remove(
      id,
      currentUser,
    );
  }
}