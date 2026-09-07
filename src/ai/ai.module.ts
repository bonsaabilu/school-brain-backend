import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
