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


import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';

import { Permission } from '@prisma/client';
import { ClassService } from './classes.service';

@Controller('classes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClassController {
  constructor(
    private readonly classService: ClassService,
  ) { }

  @Post()
  @RequirePermissions(
    Permission.CLASS_CREATE,
  )
  create(
    @Body() createClassDto: CreateClassDto,
  ) {
    return this.classService.create(
      createClassDto,
    );
  }

  @Get()
  @RequirePermissions(
    Permission.CLASS_READ,
  )
  findAll() {
    return this.classService.findAll();
  }

  @Get(':id')
  @RequirePermissions(
    Permission.CLASS_READ,
  )
  findOne(@Param('id') id: string) {
    return this.classService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(
    Permission.CLASS_UPDATE,
  )
  update(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classService.update(
      id,
      updateClassDto,
    );
  }

  @Delete(':id')
  @RequirePermissions(
    Permission.CLASS_DELETE,
  )
  remove(@Param('id') id: string) {
    return this.classService.remove(id);
  }
}