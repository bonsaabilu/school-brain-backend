import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { generateTemporaryPassword } from '../auth/utils/password-generator';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const rawPassword = createUserDto.password || generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const mustChangePassword = !createUserDto.password || createUserDto.role === 'STUDENT';

    let parentEmailTask: { email: string; firstName: string; password: string } | null = null;

    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: createUserDto.email,
          passwordHash,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          role: createUserDto.role || 'STUDENT',
          isActive: true,
          mustChangePassword,
        },
      });

      if (newUser.role === 'STUDENT') {
        const studentCode = `STU-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        const student = await tx.student.create({
          data: {
            userId: newUser.id,
            studentCode,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phoneNumber: createUserDto.phone || createUserDto.phoneNumber,
            gender: createUserDto.gender,
            address: createUserDto.address,
            dateOfBirth: createUserDto.dateOfBirth
              ? new Date(createUserDto.dateOfBirth)
              : undefined,
          },
        });

        if (createUserDto.parent?.email) {
          const p = createUserDto.parent;
          const parentEmail: string = createUserDto.parent.email;
          let parentUser = await tx.user.findUnique({
            where: { email: parentEmail },
          });

          let parentProfile;
          if (!parentUser) {
            const parentRawPassword = generateTemporaryPassword();
            const parentPassHash = await bcrypt.hash(parentRawPassword, 12);
            parentUser = await tx.user.create({
              data: {
                email: parentEmail,
                passwordHash: parentPassHash,
                firstName: p.firstName || 'Guardian',
                lastName: p.lastName || newUser.lastName,
                role: 'PARENT',
                isActive: true,
                mustChangePassword: true,
              },
            });
            parentProfile = await tx.parent.create({
              data: {
                userId: parentUser.id,
                firstName: parentUser.firstName,
                lastName: parentUser.lastName,
                phone: p.phone,
                email: parentUser.email,
              },
            });
            parentEmailTask = {
              email: parentUser.email,
              firstName: parentUser.firstName,
              password: parentRawPassword,
            };
          } else {
            parentProfile = await tx.parent.findUnique({
              where: { userId: parentUser.id },
            });
          }

          if (parentProfile) {
            await tx.parentStudent.create({
              data: {
                parentId: parentProfile.id,
                studentId: student.id,
                relationship: p.relationship || 'Guardian',
              },
            });
          }
        }
      } else if (newUser.role === 'TEACHER') {
        await tx.teacher.create({
          data: {
            userId: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: createUserDto.phone,
          },
        });
      } else if (newUser.role === 'PARENT') {
        await tx.parent.create({
          data: {
            userId: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: createUserDto.phone,
            email: newUser.email,
          },
        });
      }

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
        parentEmailTask,
      };
    });

    // Send Temporary Password Email to Student/User
    try {
      await this.emailService.sendTemporaryPasswordEmail(
        result.user.email,
        result.user.firstName,
        rawPassword,
        result.user.role,
      );
    } catch (err) {
      console.warn('Unable to send temporary password email to user:', err);
    }

    // Send Parent Temporary Password Email if new parent account was created
    if (result.parentEmailTask) {
      const pTask = result.parentEmailTask as { email: string; firstName: string; password: string };
      try {
        await this.emailService.sendTemporaryPasswordEmail(
          pTask.email,
          pTask.firstName,
          pTask.password,
          'PARENT',
        );
      } catch (err) {
        console.warn('Unable to send temporary password email to parent:', err);
      }
    }

    return result.user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            studentCode: true,
            riskScore: true,
            needsSupport: true,
            gender: true,
            phoneNumber: true,
          },
        },
        teacher: {
          select: {
            id: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async approve(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
