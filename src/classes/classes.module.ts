import { Module } from '@nestjs/common';



import { PrismaModule } from '../prisma/prisma.module';
import { ClassController } from './classes.controller';
import { ClassService } from './classes.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClassController],
  providers: [ClassService],
})
export class ClassModule { }