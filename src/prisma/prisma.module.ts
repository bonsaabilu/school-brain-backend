// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Making it global avoids having to import PrismaModule in every feature module
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
