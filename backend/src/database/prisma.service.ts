import {
  INestApplication,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private isDemoMode = process.env.DEMO_MODE === 'true';
  
  async onModuleInit() {
    if (this.isDemoMode) {
      console.log('🔧 Running in DEMO MODE - Database connection skipped');
      console.log('📝 To use full features, set up PostgreSQL database');
      return;
    }
    
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('🔧 Starting in DEMO MODE - Limited functionality');
      console.log('📝 To enable full features:');
      console.log('   1. Install PostgreSQL');
      console.log('   2. Create database and user');
      console.log('   3. Update DATABASE_URL in .env');
      console.log('   4. Run: npm run db:migrate && npm run db:seed');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Optional: close app gracefully on Node beforeExit
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
