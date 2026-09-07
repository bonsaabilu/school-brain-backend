import { Module } from '@nestjs/common';
import { ClassSubjectService } from './class-subjects.service';
import { ClassSubjectController } from './class-subjects.controller';


@Module({
  controllers: [ClassSubjectController],
  providers: [ClassSubjectService]
})
export class ClassSubjectsModule { }
