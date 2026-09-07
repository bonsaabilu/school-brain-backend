import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';



import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import { Permission } from '@prisma/client';
import { ClassSubjectService } from './class-subjects.service';

@Controller('class-subjects')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClassSubjectController {
    constructor(
        private readonly classSubjectService: ClassSubjectService,
    ) { }

    @Post()
    @RequirePermissions(
        Permission.SUBJECT_UPDATE,
    )
    create(
        @Body() dto: CreateClassSubjectDto,
    ) {
        return this.classSubjectService.create(dto);
    }

    @Get()
    @RequirePermissions(
        Permission.SUBJECT_READ,
    )
    findAll(@Query('classId') classId?: string) {
        return this.classSubjectService.findAll(classId);
    }

    @Get(':id')
    @RequirePermissions(
        Permission.SUBJECT_READ,
    )
    findOne(@Param('id') id: string) {
        return this.classSubjectService.findOne(id);
    }

    @Patch(':id')
    @RequirePermissions(
        Permission.SUBJECT_UPDATE,
    )
    update(
        @Param('id') id: string,
        @Body() dto: UpdateClassSubjectDto,
    ) {
        return this.classSubjectService.update(id, dto);
    }

    @Delete(':id')
    @RequirePermissions(
        Permission.SUBJECT_UPDATE,
    )
    remove(@Param('id') id: string) {
        return this.classSubjectService.remove(id);
    }
}