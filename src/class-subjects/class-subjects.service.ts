import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';

@Injectable()
export class ClassSubjectService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async create(
        dto: CreateClassSubjectDto,
    ) {
        // Check class
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

        // Check subject
        const subject =
            await this.prisma.subject.findUnique({
                where: {
                    id: dto.subjectId,
                },
            });

        if (!subject) {
            throw new NotFoundException(
                'Subject not found',
            );
        }

        // Check teacher if supplied
        if (dto.teacherId) {
            const teacher =
                await this.prisma.teacher.findUnique({
                    where: {
                        id: dto.teacherId,
                    },
                });

            if (!teacher) {
                throw new NotFoundException(
                    'Teacher not found',
                );
            }
        }

        // Prevent duplicate subject in same class
        const existing =
            await this.prisma.classSubject.findUnique({
                where: {
                    classId_subjectId: {
                        classId: dto.classId,
                        subjectId: dto.subjectId,
                    },
                },
            });

        if (existing) {
            throw new ConflictException(
                'This subject is already assigned to this class',
            );
        }

        return this.prisma.classSubject.create({
            data: {
                classId: dto.classId,
                subjectId: dto.subjectId,
                teacherId: dto.teacherId,
            },
            include: {
                class: true,
                subject: true,
                teacher: true,
            },
        });
    }

    async findAll(classId?: string) {
        return this.prisma.classSubject.findMany({
            where: classId ? { classId } : undefined,
            include: {
                class: true,
                subject: true,
                teacher: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string) {
        const classSubject =
            await this.prisma.classSubject.findUnique({
                where: { id },
                include: {
                    class: true,
                    subject: true,
                    teacher: true,
                },
            });

        if (!classSubject) {
            throw new NotFoundException(
                'Class subject assignment not found',
            );
        }

        return classSubject;
    }

    async update(id: string, dto: UpdateClassSubjectDto) {
        await this.findOne(id);

        if (dto.teacherId) {
            const teacher = await this.prisma.teacher.findUnique({
                where: { id: dto.teacherId },
            });
            if (!teacher) {
                throw new NotFoundException('Teacher not found');
            }
        }

        return this.prisma.classSubject.update({
            where: { id },
            data: { teacherId: dto.teacherId },
            include: {
                class: true,
                subject: true,
                teacher: true,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.classSubject.delete({
            where: { id },
        });
    }
}