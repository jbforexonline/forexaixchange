import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) { }

  @Get('status')
  async getStatus() {
    const maintenance = await this.prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' }
    });

    return {
      maintenance: maintenance?.value === 'true',
      timestamp: new Date().toISOString()
    };
  }
}
