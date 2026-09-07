import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  create(createTeacherDto: CreateTeacherDto) {
    return 'This action adds a new teacher';
  }

  findAll() {
    return this.prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
        classes: {
          include: {
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
          orderBy: {
            name: 'asc',
          },
        },
        classSubjects: {
          include: {
            class: {
              include: {
                enrollments: {
                  include: {
                    student: true,
                  },
                },
              },
            },
            subject: true,
          },
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        OR: [
          { id },
          { userId: id },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
        classes: {
          include: {
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
          orderBy: {
            name: 'asc',
          },
        },
        classSubjects: {
          include: {
            class: {
              include: {
                enrollments: {
                  include: {
                    student: true,
                  },
                },
              },
            },
            subject: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return teacher;
  }

  async findByUser(userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
        classes: {
          include: {
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
          orderBy: {
            name: 'asc',
          },
        },
        classSubjects: {
          include: {
            class: {
              include: {
                enrollments: {
                  include: {
                    student: true,
                  },
                },
              },
            },
            subject: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with User ID ${userId} not found`);
    }

    return teacher;
  }

  update(id: string, updateTeacherDto: UpdateTeacherDto) {
    return this.prisma.teacher.update({
      where: { id },
      data: updateTeacherDto,
    });
  }

  remove(id: string) {
    return this.prisma.teacher.delete({
      where: { id },
    });
  }
}
