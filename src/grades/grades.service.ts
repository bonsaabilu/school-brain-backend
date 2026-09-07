import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

import { Role, User } from '@prisma/client';

@Injectable()
export class GradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) { }

  async create(
    dto: CreateGradeDto,
    currentUser: User,
  ) {
    /*
     * 1. Find student
     */
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

    /*
     * 2. Find ClassSubject
     */
    const classSubject =
      await this.prisma.classSubject.findUnique({
        where: {
          id: dto.classSubjectId,
        },
        include: {
          class: true,
          subject: true,
          teacher: true,
        },
      });

    if (!classSubject) {
      throw new NotFoundException(
        'Class subject not found',
      );
    }

    /*
     * 3. Make sure student is enrolled
     *    in the class.
     */
    const enrollment =
      await this.prisma.enrollment.findUnique({
        where: {
          studentId_classId: {
            studentId: dto.studentId,
            classId: classSubject.classId,
          },
        },
      });

    if (!enrollment) {
      throw new ForbiddenException(
        'Student is not enrolled in this class',
      );
    }

    /*
     * 4. Validate score
     */
    const maxScore =
      dto.maxScore ?? 100;

    if (dto.score > maxScore) {
      throw new ForbiddenException(
        'Score cannot be greater than max score',
      );
    }

    /*
     * 5. Identify teacher
     */
    let teacherId: string;

    if (currentUser.role === Role.TEACHER) {
      const teacher =
        await this.prisma.teacher.findUnique({
          where: {
            userId: currentUser.id,
          },
        });

      if (!teacher) {
        throw new ForbiddenException(
          'Teacher profile not found',
        );
      }

      /*
       * Teacher must be assigned to
       * this ClassSubject.
       */
      if (
        classSubject.teacherId !== teacher.id
      ) {
        throw new ForbiddenException(
          'You are not assigned to this class subject',
        );
      }

      teacherId = teacher.id;
    } else {
      /*
       * Admin / Super Admin
       */
      if (!classSubject.teacherId) {
        throw new ForbiddenException(
          'This class subject has no teacher assigned',
        );
      }

      teacherId = classSubject.teacherId;
    }

    /*
     * 6. Prevent duplicate grade
     *
     * Same student + same subject/class +
     * same term = one grade.
     */
    const existing =
      await this.prisma.grade.findUnique({
        where: {
          studentId_classSubjectId_term: {
            studentId: dto.studentId,
            classSubjectId: dto.classSubjectId,
            term: dto.term,
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'A grade already exists for this student, subject and term',
      );
    }

    /*
     * 7. Create grade
     */
    const created = await this.prisma.grade.create({
      data: {
        studentId: dto.studentId,
        classSubjectId: dto.classSubjectId,
        teacherId,
        score: dto.score,
        maxScore,
        term: dto.term,
      },
      include: {
        student: true,
        classSubject: {
          include: {
            class: true,
            subject: true,
            teacher: true,
          },
        },
        teacher: true,
      },
    });

    // Automatically re-evaluate student AI risk in background
    this.aiService.evaluateStudentRisk(dto.studentId).catch(() => {});

    return created;
  }

  async findAll() {
    return this.prisma.grade.findMany({
      include: {
        student: true,
        classSubject: {
          include: {
            class: true,
            subject: true,
          },
        },
        teacher: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const grade =
      await this.prisma.grade.findUnique({
        where: {
          id,
        },
        include: {
          student: true,
          classSubject: {
            include: {
              class: true,
              subject: true,
              teacher: true,
            },
          },
          teacher: true,
        },
      });

    if (!grade) {
      throw new NotFoundException(
        'Grade not found',
      );
    }

    return grade;
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

    return this.prisma.grade.findMany({
      where: {
        studentId,
      },
      include: {
        classSubject: {
          include: {
            class: true,
            subject: true,
          },
        },
        teacher: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByClassSubject(
    classSubjectId: string,
  ) {
    const classSubject =
      await this.prisma.classSubject.findUnique({
        where: {
          id: classSubjectId,
        },
      });

    if (!classSubject) {
      throw new NotFoundException(
        'Class subject not found',
      );
    }

    return this.prisma.grade.findMany({
      where: {
        classSubjectId,
      },
      include: {
        student: true,
        teacher: true,
      },
      orderBy: {
        student: {
          lastName: 'asc',
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateGradeDto,
    currentUser: User,
  ) {
    const grade =
      await this.findOne(id);

    /*
     * Teacher can only modify grades
     * they recorded.
     */
    if (currentUser.role === Role.TEACHER) {
      const teacher =
        await this.prisma.teacher.findUnique({
          where: {
            userId: currentUser.id,
          },
        });

      if (
        !teacher ||
        grade.teacherId !== teacher.id
      ) {
        throw new ForbiddenException(
          'You cannot modify this grade',
        );
      }
    }

    /*
     * Validate score if supplied.
     */
    if (
      dto.score !== undefined &&
      dto.maxScore !== undefined &&
      dto.score > dto.maxScore
    ) {
      throw new ForbiddenException(
        'Score cannot be greater than max score',
      );
    }

    if (
      dto.score !== undefined &&
      dto.maxScore === undefined &&
      dto.score > grade.maxScore
    ) {
      throw new ForbiddenException(
        'Score cannot be greater than max score',
      );
    }

    if (
      dto.maxScore !== undefined &&
      dto.score === undefined &&
      grade.score > dto.maxScore
    ) {
      throw new ForbiddenException(
        'Max score cannot be lower than the current score',
      );
    }

    const updated = await this.prisma.grade.update({
      where: {
        id,
      },
      data: dto,
      include: {
        student: true,
        classSubject: {
          include: {
            class: true,
            subject: true,
          },
        },
        teacher: true,
      },
    });

    if (updated.studentId) {
      this.aiService.evaluateStudentRisk(updated.studentId).catch(() => {});
    }

    return updated;
  }

  async remove(
    id: string,
    currentUser: User,
  ) {
    const grade =
      await this.findOne(id);

    /*
     * Teacher can only delete grades
     * they recorded.
     */
    if (currentUser.role === Role.TEACHER) {
      const teacher =
        await this.prisma.teacher.findUnique({
          where: {
            userId: currentUser.id,
          },
        });

      if (
        !teacher ||
        grade.teacherId !== teacher.id
      ) {
        throw new ForbiddenException(
          'You cannot delete this grade',
        );
      }
    }

    const deleted = await this.prisma.grade.delete({
      where: {
        id,
      },
    });

    if (deleted.studentId) {
      this.aiService.evaluateStudentRisk(deleted.studentId).catch(() => {});
    }

    return deleted;
  }
}