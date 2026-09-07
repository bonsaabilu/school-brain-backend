import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GradeController } from './grades.controller';
import { GradeService } from './grades.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [GradeController],
  providers: [GradeService],
  exports: [GradeService],
})
export class GradeModule { }