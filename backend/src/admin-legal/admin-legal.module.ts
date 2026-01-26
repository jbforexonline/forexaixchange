import { Module } from '@nestjs/common';
import { AdminLegalController } from './admin-legal.controller';
import { AdminLegalService } from './admin-legal.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [AdminLegalController],
  providers: [AdminLegalService, PrismaService],
})
export class AdminLegalModule {}
