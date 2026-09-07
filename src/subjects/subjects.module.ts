import { Module } from '@nestjs/common';



import { PrismaModule } from '../prisma/prisma.module';
import { SubjectController } from './subjects.controller';
import { SubjectService } from './subjects.service';

@Module({
  imports: [PrismaModule],
  controllers: [SubjectController],
  providers: [SubjectService],
})
export class SubjectModule { }