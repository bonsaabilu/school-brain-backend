import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(
    createSubjectDto: CreateSubjectDto,
  ) {
    const existingSubject =
      await this.prisma.subject.findUnique({
        where: {
          code: createSubjectDto.code,
        },
      });

    if (existingSubject) {
      throw new ConflictException(
        'A subject with this code already exists',
      );
    }

    return this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        code: createSubjectDto.code,
      },
    });
  }

  async findAll() {
    return this.prisma.subject.findMany({
      include: {
        classSubjects: {
          include: {
            class: true,
            teacher: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const subject =
      await this.prisma.subject.findUnique({
        where: { id },
        include: {
          classSubjects: {
            include: {
              class: true,
              teacher: true,
            },
          },
        },
      });

    if (!subject) {
      throw new NotFoundException(
        'Subject not found',
      );
    }

    return subject;
  }

  async update(
    id: string,
    updateSubjectDto: UpdateSubjectDto,
  ) {
    await this.findOne(id);

    if (updateSubjectDto.code) {
      const existingSubject =
        await this.prisma.subject.findFirst({
          where: {
            code: updateSubjectDto.code,
            NOT: {
              id,
            },
          },
        });

      if (existingSubject) {
        throw new ConflictException(
          'A subject with this code already exists',
        );
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: updateSubjectDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.subject.delete({
      where: { id },
    });
  }
}