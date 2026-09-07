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



import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import { Permission } from '@prisma/client';
import { SubjectService } from './subjects.service';

@Controller('subjects')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SubjectController {
  constructor(
    private readonly subjectService: SubjectService,
  ) { }

  @Post()
  @RequirePermissions(
    Permission.SUBJECT_CREATE,
  )
  create(
    @Body() createSubjectDto: CreateSubjectDto,
  ) {
    return this.subjectService.create(
      createSubjectDto,
    );
  }

  @Get()
  @RequirePermissions(
    Permission.SUBJECT_READ,
  )
  findAll() {
    return this.subjectService.findAll();
  }

  @Get(':id')
  @RequirePermissions(
    Permission.SUBJECT_READ,
  )
  findOne(@Param('id') id: string) {
    return this.subjectService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(
    Permission.SUBJECT_UPDATE,
  )
  update(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    return this.subjectService.update(
      id,
      updateSubjectDto,
    );
  }

  @Delete(':id')
  @RequirePermissions(
    Permission.SUBJECT_DELETE,
  )
  remove(@Param('id') id: string) {
    return this.subjectService.remove(id);
  }
}