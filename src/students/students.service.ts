import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  create(createStudentDto: CreateStudentDto) {
    return 'This action adds a new student';
  }

  async findAll() {
    const students = await this.prisma.student.findMany({
      include: {
        user: true,
        attendances: true,
        grades: true,
        enrollments: {
          include: {
            class: {
              include: {
                teacher: true,
                classSubjects: {
                  include: {
                    subject: true,
                    teacher: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    // Automatically evaluate students who have not yet been evaluated by AI
    const unevaluated = students.filter(
      (s) => s.needsSupport === null || s.riskScore === null || s.riskScore === undefined,
    );

    if (unevaluated.length > 0) {
      await Promise.allSettled(
        unevaluated.map(async (student) => {
          try {
            const res = await this.aiService.evaluateStudentData(student);
            student.needsSupport = res.needs_support;
            student.riskScore = res.risk_probability;
          } catch (e) {
            // graceful fallback if AI service is temporarily offline
          }
        }),
      );
    }

    return students;
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        attendances: {
          include: {
            classSubject: {
              include: {
                subject: true,
                teacher: true,
              },
            },
            teacher: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
        grades: {
          include: {
            classSubject: {
              include: {
                subject: true,
                teacher: true,
              },
            },
            teacher: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        enrollments: {
          include: {
            class: {
              include: {
                teacher: true,
                classSubjects: {
                  include: {
                    subject: true,
                    teacher: true,
                  },
                },
              },
            },
          },
        },
        parents: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // If student lacks AI evaluation, evaluate automatically
    if (student.needsSupport === null || student.riskScore === null || student.riskScore === undefined) {
      try {
        const res = await this.aiService.evaluateStudentData(student);
        student.needsSupport = res.needs_support;
        student.riskScore = res.risk_probability;
      } catch (e) {
        // continue
      }
    }

    return student;
  }

  async findByUserId(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: true,
        attendances: {
          include: {
            classSubject: {
              include: {
                subject: true,
                teacher: true,
              },
            },
            teacher: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
        grades: {
          include: {
            classSubject: {
              include: {
                subject: true,
                teacher: true,
              },
            },
            teacher: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        enrollments: {
          include: {
            class: {
              include: {
                teacher: true,
                classSubjects: {
                  include: {
                    subject: true,
                    teacher: true,
                  },
                },
              },
            },
          },
        },
        parents: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student profile for user ${userId} not found`);
    }

    if (student.needsSupport === null || student.riskScore === null || student.riskScore === undefined) {
      try {
        const res = await this.aiService.evaluateStudentData(student);
        student.needsSupport = res.needs_support;
        student.riskScore = res.risk_probability;
      } catch (e) {
        // continue
      }
    }

    return student;
  }

  async getStudentSubjects(studentId: string) {
    const student = await this.findOne(studentId);
    const subjectsMap = new Map<string, any>();

    for (const enr of student.enrollments || []) {
      for (const cs of enr.class?.classSubjects || []) {
        if (!subjectsMap.has(cs.id)) {
          subjectsMap.set(cs.id, {
            classSubjectId: cs.id,
            classId: enr.class?.id,
            className: enr.class?.name,
            academicYear: enr.class?.academicYear,
            subjectId: cs.subject?.id,
            subjectName: cs.subject?.name,
            subjectCode: cs.subject?.code,
            teacher: cs.teacher,
          });
        }
      }
    }

    return Array.from(subjectsMap.values());
  }

  update(id: string, updateStudentDto: UpdateStudentDto) {
    return `This action updates a #${id} student`;
  }

  remove(id: string) {
    return `This action removes a #${id} student`;
  }
}
