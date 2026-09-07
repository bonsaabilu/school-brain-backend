import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';


import { UpdateClassDto } from './dto/update-class.dto';
import { CreateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(createClassDto: CreateClassDto) {
    const existingClass =
      await this.prisma.class.findFirst({
        where: {
          name: createClassDto.name,
          academicYear:
            createClassDto.academicYear,
        },
      });

    if (existingClass) {
      throw new ConflictException(
        'A class with this name already exists for this academic year',
      );
    }

    // If a teacher was provided,
    // make sure the teacher exists.
    if (createClassDto.teacherId) {
      const teacher =
        await this.prisma.teacher.findUnique({
          where: {
            id: createClassDto.teacherId,
          },
        });

      if (!teacher) {
        throw new NotFoundException(
          'Teacher not found',
        );
      }
    }

    return this.prisma.class.create({
      data: {
        name: createClassDto.name,
        academicYear:
          createClassDto.academicYear,
        teacherId:
          createClassDto.teacherId,
      },
      include: {
        teacher: true,
      },
    });
  }

  async findAll() {
    return this.prisma.class.findMany({
      include: {
        teacher: true,
        enrollments: true,
        classSubjects: {
          include: {
            subject: true,
            teacher: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const schoolClass =
      await this.prisma.class.findUnique({
        where: { id },
        include: {
          teacher: true,
          enrollments: {
            include: {
              student: true,
            },
          },
          classSubjects: {
            include: {
              subject: true,
              teacher: true,
            },
          },
        },
      });

    if (!schoolClass) {
      throw new NotFoundException(
        'Class not found',
      );
    }

    return schoolClass;
  }

  async update(
    id: string,
    updateClassDto: UpdateClassDto,
  ) {
    await this.findOne(id);

    if (updateClassDto.teacherId) {
      const teacher =
        await this.prisma.teacher.findUnique({
          where: {
            id: updateClassDto.teacherId,
          },
        });

      if (!teacher) {
        throw new NotFoundException(
          'Teacher not found',
        );
      }
    }

    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
      include: {
        teacher: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.class.delete({
      where: { id },
    });
  }
}