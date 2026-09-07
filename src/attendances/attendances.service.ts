import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

import { Role, User } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) { }

  async create(
    dto: CreateAttendanceDto,
    currentUser: User,
  ) {
    /*
     * 1. Find the student.
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
     * 2. Find the ClassSubject.
     *
     * This gives us:
     * - class
     * - subject
     * - assigned teacher
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
     * 3. Make sure the student belongs
     *    to this class.
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
     * 4. Determine which teacher is recording
     *    the attendance.
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
       * Teacher must be the teacher assigned
       * to this ClassSubject.
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
       * Admin/Super Admin can record attendance,
       * but they must provide a teacher through
       * another administrative workflow.
       *
       * For now, require the ClassSubject to
       * already have an assigned teacher.
       */
      if (!classSubject.teacherId) {
        throw new ForbiddenException(
          'This class subject has no teacher assigned',
        );
      }

      teacherId = classSubject.teacherId;
    }

    /*
     * 5. Check duplicate attendance.
     */
    const attendanceDate =
      new Date(dto.date);

    const existing =
      await this.prisma.attendance.findUnique({
        where: {
          studentId_classSubjectId_date: {
            studentId: dto.studentId,
            classSubjectId: dto.classSubjectId,
            date: attendanceDate,
          },
        },
      });

    if (existing) {
      throw new ConflictException(
        'Attendance has already been recorded for this student on this date',
      );
    }

    /*
     * 6. Create attendance.
     */
    const created = await this.prisma.attendance.create({
      data: {
        studentId: dto.studentId,
        classSubjectId: dto.classSubjectId,
        teacherId,
        date: attendanceDate,
        status: dto.status,
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

  async findOne(id: string) {
    const attendance =
      await this.prisma.attendance.findUnique({
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

    if (!attendance) {
      throw new NotFoundException(
        'Attendance not found',
      );
    }

    return attendance;
  }

  async findAll() {
    return this.prisma.attendance.findMany({
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
        date: 'desc',
      },
    });
  }

  async findByStudent(studentId: string) {
    return this.prisma.attendance.findMany({
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
        date: 'desc',
      },
    });
  }

  async findByClassSubject(
    classSubjectId: string,
  ) {
    return this.prisma.attendance.findMany({
      where: {
        classSubjectId,
      },
      include: {
        student: true,
        teacher: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async update(
    id: string,
    dto: UpdateAttendanceDto,
    currentUser: User,
  ) {
    const attendance =
      await this.findOne(id);

    /*
     * A teacher can only modify attendance
     * that they recorded.
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
        attendance.teacherId !== teacher.id
      ) {
        throw new ForbiddenException(
          'You cannot modify this attendance record',
        );
      }
    }

    const updated = await this.prisma.attendance.update({
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

    // Automatically re-evaluate student AI risk in background
    if (updated.studentId) {
      this.aiService.evaluateStudentRisk(updated.studentId).catch(() => {});
    }

    return updated;
  }

  async remove(
    id: string,
    currentUser: User,
  ) {
    const attendance =
      await this.findOne(id);

    /*
     * Teachers can only delete records
     * they created.
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
        attendance.teacherId !== teacher.id
      ) {
        throw new ForbiddenException(
          'You cannot delete this attendance record',
        );
      }
    }

    const deleted = await this.prisma.attendance.delete({
      where: {
        id,
      },
    });

    // Automatically re-evaluate student AI risk in background
    if (deleted.studentId) {
      this.aiService.evaluateStudentRisk(deleted.studentId).catch(() => {});
    }

    return deleted;
  }
}