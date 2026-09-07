import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(dto: CreateEnrollmentDto) {
    // 1. Check that the student exists
    const student =
      await this.prisma.student.findUnique({
        where: {
          id: dto.studentId,
        },
      });

    if (!student) {
      throw new NotFoundException(
        'Student not found',
      );
    }

    // 2. Check that the class exists
    const schoolClass =
      await this.prisma.class.findUnique({
        where: {
          id: dto.classId,
        },
      });

    if (!schoolClass) {
      throw new NotFoundException(
        'Class not found',
      );
    }

    // 3. Check if student is already enrolled
    // in this class
    const existingEnrollment =
      await this.prisma.enrollment.findUnique({
        where: {
          studentId_classId: {
            studentId: dto.studentId,
            classId: dto.classId,
          },
        },
      });

    if (existingEnrollment) {
      throw new ConflictException(
        'Student is already enrolled in this class',
      );
    }

    // 4. Create enrollment
    return this.prisma.enrollment.create({
      data: {
        studentId: dto.studentId,
        classId: dto.classId,
      },
      include: {
        student: true,
        class: {
          include: {
            classSubjects: {
              include: {
                subject: true,
                teacher: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.enrollment.findMany({
      include: {
        student: true,
        class: {
          include: {
            classSubjects: {
              include: {
                subject: true,
                teacher: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const enrollment =
      await this.prisma.enrollment.findUnique({
        where: {
          id,
        },
        include: {
          student: true,
          class: {
            include: {
              classSubjects: {
                include: {
                  subject: true,
                  teacher: true,
                },
              },
            },
          },
        },
      });

    if (!enrollment) {
      throw new NotFoundException(
        'Enrollment not found',
      );
    }

    return enrollment;
  }

  async findByClass(classId: string) {
    const schoolClass =
      await this.prisma.class.findUnique({
        where: {
          id: classId,
        },
      });

    if (!schoolClass) {
      throw new NotFoundException(
        'Class not found',
      );
    }

    return this.prisma.enrollment.findMany({
      where: {
        classId,
      },
      include: {
        student: true,
        class: {
          include: {
            classSubjects: {
              include: {
                subject: true,
                teacher: true,
              },
            },
          },
        },
      },
      orderBy: {
        student: {
          lastName: 'asc',
        },
      },
    });
  }

  async findByStudent(studentId: string) {
    const student =
      await this.prisma.student.findUnique({
        where: {
          id: studentId,
        },
      });

    if (!student) {
      throw new NotFoundException(
        'Student not found',
      );
    }

    return this.prisma.enrollment.findMany({
      where: {
        studentId,
      },
      include: {
        class: {
          include: {
            classSubjects: {
              include: {
                subject: true,
                teacher: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.enrollment.delete({
      where: {
        id,
      },
    });
  }
}