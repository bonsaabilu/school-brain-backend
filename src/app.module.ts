import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { GradeModule } from './grades/grades.module';
import { AttendanceModule } from './attendances/attendances.module';

import { ParentsModule } from './parents/parents.module';
import { TeachersModule } from './teachers/teachers.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { ClassModule } from './classes/classes.module';
import { SubjectModule } from './subjects/subjects.module';
import { ClassSubjectsModule } from './class-subjects/class-subjects.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    ParentsModule,
    ClassModule,
    SubjectModule,
    AttendanceModule,
    GradeModule,
    EmailModule,
    ClassSubjectsModule,
    EnrollmentModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
