import { Module } from '@nestjs/common';
import { SpinsService } from './spins.service';
import { SpinsController } from './spins.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [SpinsController],
  providers: [SpinsService, PrismaService],
  exports: [SpinsService],
})
export class SpinsModule {}
