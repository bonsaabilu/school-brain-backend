import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';

import { RegisterDto } from './dto/register.dto';

import { LoginDto } from './dto/login.dto';

import { CreateUserDto } from './dto/create-user.dto';

import { User, Role, Permission } from '@prisma/client';

import { assertCanRegisterRole } from './policies/registration.policy';

import { generateTemporaryPassword } from './utils/password-generator';
import { EmailService } from 'src/email/email.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Public registration.
   *
   * Anyone can use this endpoint, but it can only
   * create a STUDENT account.
   */
  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const password = registerDto.password || generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(password, 12);
    
    // By default, registration is for STUDENT unless specified otherwise,
    // though the endpoint comment suggests it's primarily for students.
    const role = registerDto.role || Role.STUDENT;

    if (role === Role.STUDENT) {
      if (!registerDto.parent) {
        throw new ConflictException('Parent information is required when registering a student');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: registerDto.email,
          passwordHash,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role: role,
          isActive: false, // Requires Admin or Super Admin approval before login
          // If password was auto-generated, they should change it on first login
          mustChangePassword: !registerDto.password,
        },
      });

      if (role === Role.STUDENT) {
        let studentCode = registerDto.studentCode;
        if (!studentCode) {
          studentCode = `STU-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const student = await tx.student.create({
          data: {
            userId: newUser.id,
            studentCode: studentCode,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phoneNumber: registerDto.phone,
          },
        });

        let parent: any = null;
        let emailTask: { email: string, firstName: string, password: string } | null = null;

        if (registerDto.parent) {
          const parentData = registerDto.parent;
          let parentUser = await tx.user.findUnique({
            where: { email: parentData.email },
          });

          if (parentUser) {
            if (parentUser.role !== Role.PARENT) {
              throw new ConflictException('The parent email already belongs to another role');
            }
            parent = await tx.parent.findUnique({
              where: { userId: parentUser.id },
            });
            if (!parent) {
              throw new ConflictException('Parent account exists but parent profile is missing');
            }
          } else {
            const parentPassword = generateTemporaryPassword();
            const parentPasswordHash = await bcrypt.hash(parentPassword, 12);

            parentUser = await tx.user.create({
              data: {
                email: parentData.email,
                passwordHash: parentPasswordHash,
                firstName: parentData.firstName,
                lastName: parentData.lastName,
                role: Role.PARENT,
                isActive: true,
                mustChangePassword: true,
              },
            });

            parent = await tx.parent.create({
              data: {
                userId: parentUser.id,
                firstName: parentData.firstName,
                lastName: parentData.lastName,
                phone: parentData.phone,
                email: parentData.email,
              },
            });

            emailTask = {
              email: parentUser.email,
              firstName: parentUser.firstName,
              password: parentPassword,
            };
          }

          if (parent) {
            await tx.parentStudent.create({
              data: {
                parentId: parent.id,
                studentId: student.id,
                relationship: parentData.relationship,
              },
            });
          }
        }

        return { user: newUser, profile: student, parent, emailTask };
      }

      if (role === Role.TEACHER) {
        const teacher = await tx.teacher.create({
          data: {
            userId: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: registerDto.phone,
          },
        });

        return { user: newUser, profile: teacher, parent: null, emailTask: null };
      }

      return { user: newUser, profile: null, parent: null, emailTask: null };
    });

    if (result.emailTask) {
      await this.emailService.sendTemporaryPasswordEmail(
        result.emailTask.email,
        result.emailTask.firstName,
        result.emailTask.password,
        Role.PARENT,
      );
    }

    if (!registerDto.password) {
      await this.emailService.sendTemporaryPasswordEmail(
        result.user.email,
        result.user.firstName,
        password,
        result.user.role,
      );
    }

    return {
      message: `${role} registration submitted successfully. Your account is pending administrator approval before you can sign in.`,
      user: this.sanitizeUser(result.user),
      ...(result.profile ? { profile: result.profile } : {}),
      ...(result.parent ? { parent: result.parent } : {}),
    };
  }

  /**
   * Authenticated registration.
   *
   * SUPER_ADMIN:
   *   → ADMIN
   *   → TEACHER
   *   → STUDENT
   *   → PARENT
   *
   * ADMIN:
   *   → TEACHER
   *   → STUDENT
   *
   * TEACHER:
   *   → STUDENT
   *
   * For ADMIN and TEACHER accounts, the system
   * generates a temporary password automatically.
   */
  async createUser(
    createUserDto: CreateUserDto,
    currentUser: User,
  ) {
    // ==========================================
    // 1. CHECK ROLE PERMISSION
    // ==========================================

    assertCanRegisterRole(
      currentUser.role,
      createUserDto.role,
    );

    // ==========================================
    // 2. STUDENT VALIDATION
    // ==========================================

    if (
      createUserDto.role === Role.STUDENT &&
      !createUserDto.parent
    ) {
      throw new ConflictException(
        'Parent information is required when registering a student',
      );
    }

    // studentCode is no longer required from frontend; auto-generated below if missing.
    // ==========================================
    // 3. CHECK USER EMAIL
    // ==========================================

    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email: createUserDto.email,
        },
      });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists',
      );
    }

    // ==========================================
    // 4. GENERATE TEMPORARY PASSWORD
    // ==========================================

    const temporaryPassword =
      generateTemporaryPassword();

    const passwordHash = await bcrypt.hash(
      temporaryPassword,
      12,
    );

    // ==========================================
    // 5. CREATE USER + PROFILE
    // ==========================================

    const result = await this.prisma.$transaction(
      async (tx) => {
        // --------------------------------------
        // Create main User
        // --------------------------------------

        const newUser = await tx.user.create({
          data: {
            email: createUserDto.email,
            passwordHash,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            role: createUserDto.role,
            mustChangePassword: true,
          },
        });

        // ======================================
        // TEACHER
        // ======================================

        if (createUserDto.role === Role.TEACHER) {
          const teacher =
            await tx.teacher.create({
              data: {
                userId: newUser.id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                phone: createUserDto.phone,
              },
            });

          return {
            user: newUser,
            profile: teacher,
          };
        }

        // ======================================
        // STUDENT
        // ======================================

        if (createUserDto.role === Role.STUDENT) {
          const student =
            await tx.student.create({
              data: {
                userId: newUser.id,
                studentCode:
                  createUserDto.studentCode || `STU-${Date.now().toString().slice(-6)}`,
                firstName: newUser.firstName,
                lastName: newUser.lastName,

                dateOfBirth:
                  createUserDto.dateOfBirth
                    ? new Date(
                      createUserDto.dateOfBirth,
                    )
                    : undefined,

                gender: createUserDto.gender,
                address: createUserDto.address,
                phoneNumber:
                  createUserDto.phoneNumber,
              },
            });

          // ------------------------------------
          // Parent information is guaranteed
          // because of validation above.
          // ------------------------------------

          const parentData =
            createUserDto.parent!;

          // ------------------------------------
          // Find existing parent account
          // ------------------------------------

          let parentUser =
            await tx.user.findUnique({
              where: {
                email: parentData.email,
              },
            });

          let parent;
          let emailTask: { email: string, firstName: string, password: string } | null = null;

          // ====================================
          // EXISTING PARENT
          // ====================================

          if (parentUser) {
            // Make sure the account is actually
            // a parent account.

            if (
              parentUser.role !== Role.PARENT
            ) {
              throw new ConflictException(
                'The parent email already belongs to another role',
              );
            }

            parent =
              await tx.parent.findUnique({
                where: {
                  userId: parentUser.id,
                },
              });

            if (!parent) {
              throw new ConflictException(
                'Parent account exists but parent profile is missing',
              );
            }
          }

          // ====================================
          // NEW PARENT
          // ====================================

          else {
            const parentPassword =
              generateTemporaryPassword();

            const parentPasswordHash =
              await bcrypt.hash(
                parentPassword,
                12,
              );

            parentUser =
              await tx.user.create({
                data: {
                  email: parentData.email,
                  passwordHash:
                    parentPasswordHash,
                  firstName:
                    parentData.firstName,
                  lastName:
                    parentData.lastName,
                  role: Role.PARENT,
                  mustChangePassword: true,
                },
              });

            parent =
              await tx.parent.create({
                data: {
                  userId: parentUser.id,
                  firstName:
                    parentData.firstName,
                  lastName:
                    parentData.lastName,
                  phone: parentData.phone,
                  email: parentData.email,
                },
              });

            // ----------------------------------
            // Defer sending email
            // ----------------------------------

            emailTask = {
              email: parentUser.email,
              firstName: parentUser.firstName,
              password: parentPassword,
            };
          }

          // ====================================
          // CONNECT PARENT AND STUDENT
          // ====================================

          await tx.parentStudent.create({
            data: {
              parentId: parent.id,
              studentId: student.id,
              relationship:
                parentData.relationship,
            },
          });

          return {
            user: newUser,
            profile: student,
            parent,
            emailTask,
          };
        }

        // ======================================
        // PARENT DIRECT REGISTRATION
        // ======================================

        if (createUserDto.role === Role.PARENT) {
          const parent =
            await tx.parent.create({
              data: {
                userId: newUser.id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                phone: createUserDto.phone,
                email: newUser.email,
              },
            });

          return {
            user: newUser,
            profile: parent,
          };
        }

        // ======================================
        // ADMIN / SUPER ADMIN
        // ======================================

          return {
            user: newUser,
            profile: null,
            emailTask: null,
          };
      },
    );

    // ==========================================
    // 6. SEND EMAIL FOR ADMIN / TEACHER
    // ==========================================

    if (
      createUserDto.role === Role.ADMIN ||
      createUserDto.role === Role.TEACHER
    ) {
      await this.emailService
        .sendTemporaryPasswordEmail(
          result.user.email,
          result.user.firstName,
          temporaryPassword,
          result.user.role,
        );
    }
    
    if (result.emailTask) {
      await this.emailService.sendTemporaryPasswordEmail(
        result.emailTask.email,
        result.emailTask.firstName,
        result.emailTask.password,
        Role.PARENT,
      );
    }

    // ==========================================
    // 7. RESPONSE
    // ==========================================

    return {
      message:
        `${createUserDto.role} account created successfully`,
      user: this.sanitizeUser(result.user),
      profile: result.profile,
      ...(result.parent
        ? {
          parent: result.parent,
        }
        : {}),
    };
  }

  /**
   * Get the permission required to create
   * a particular type of account.
   */
  private getCreatePermission(role: Role): Permission {
    switch (role) {
      case Role.ADMIN:
        return Permission.USER_CREATE;

      case Role.TEACHER:
        return Permission.TEACHER_CREATE;

      case Role.STUDENT:
        return Permission.STUDENT_CREATE;

      case Role.PARENT:
        return Permission.PARENT_CREATE;

      default:
        throw new ForbiddenException('Invalid registration role');
    }
  }

  /**
   * Check whether a role has a specific permission.
   */
  private async userHasPermission(
    role: Role,
    permission: Permission,
  ): Promise<boolean> {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        role_permission: {
          role,
          permission,
        },
      },
    });

    return !!rolePermission;
  }

  /**
   * Login.
   */
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account is pending administrator approval. Please wait for an Admin or Super Admin to activate your account.',
      );
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Remove passwordHash before returning
   * a user to the client.
   */
  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;

    return safeUser;
  }
  async changePassword(
    currentUser: User,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'User account is not available',
      );
    }

    const passwordMatches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Current password is incorrect',
      );
    }

    if (
      changePasswordDto.currentPassword ===
      changePasswordDto.newPassword
    ) {
      throw new ConflictException(
        'New password must be different from the current password',
      );
    }

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );

    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    return {
      message: 'Password changed successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }
  private async createRoleProfile(
    tx: any,
    user: User,
    createUserDto: CreateUserDto,
  ) {
    switch (createUserDto.role) {
      case 'TEACHER':
        return tx.teacher.create({
          data: {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: createUserDto.phone,
          },
        });

      case 'STUDENT':
        const studentCode =
          createUserDto.studentCode ||
          `STU-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;

        return tx.student.create({
          data: {
            userId: user.id,
            studentCode: studentCode,
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: createUserDto.dateOfBirth
              ? new Date(createUserDto.dateOfBirth)
              : undefined,
            gender: createUserDto.gender,
            address: createUserDto.address,
            phoneNumber: createUserDto.phoneNumber,
          },
        });

      case 'PARENT':
        if (!createUserDto.phone) {
          throw new ConflictException(
            'phone is required when creating a parent',
          );
        }

        return tx.parent.create({
          data: {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: createUserDto.phone,
            email: user.email,
          },
        });

      default:
        return null;
    }
  }
}
