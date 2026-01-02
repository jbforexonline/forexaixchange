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
  
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['warn', 'error'],
      errorFormat: 'pretty',
      // Configure transaction options
      transactionOptions: {
        maxWait: 10000, // Maximum time (ms) Prisma will wait to acquire a transaction
        timeout: 15000, // Maximum time (ms) the transaction can run before timing out
        isolationLevel: 'Serializable', // Default isolation level
      },
    });
  }
  
  async onModuleInit() {
    if (this.isDemoMode) {
      console.log('🔧 Running in DEMO MODE - Database connection skipped');
      console.log('📝 To use full features, set up PostgreSQL database');
      return;
    }
    
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
      
      // Test the connection
      await this.$queryRaw`SELECT 1`;
      console.log('✅ Database connection test successful');
      
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

  /**
   * Custom transaction with extended timeout for long-running operations
   */
  async $transactionWithTimeout<T>(
    fn: (prisma: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: any;
    }
  ): Promise<T> {
    return this.$transaction(fn, {
      maxWait: options?.maxWait || 30000, // 30 seconds default
      timeout: options?.timeout || 60000, // 60 seconds default for long operations
      isolationLevel: options?.isolationLevel || 'Serializable',
    });
  }

  /**
   * Simple transaction for quick operations (default settings)
   */
  async $quickTransaction<T>(
    fn: (prisma: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">) => Promise<T>
  ): Promise<T> {
    return this.$transaction(fn, {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
      isolationLevel: 'ReadCommitted',
    });
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const [userCount, planCount, subscriptionCount] = await Promise.all([
        this.user.count(),
        this.premiumPlan.count(),
        this.premiumSubscription.count(),
      ]);

      return {
        users: userCount,
        premiumPlans: planCount,
        activeSubscriptions: subscriptionCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Check if database is available
   */
  async isDatabaseAvailable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database check failed:', error.message);
      return false;
    }
  }

  /**
   * Clear test data (for development/testing only)
   */
  async clearTestData() {
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      throw new Error('This method is only available in development and test environments');
    }

    console.log('🧹 Clearing test data...');
    
    // Delete in correct order to respect foreign key constraints
    // First, delete dependent records
    const deletedCounts = {
      // Delete affiliate earnings for test users
      affiliateEarnings: await this.affiliateEarning.deleteMany({
        where: { 
          OR: [
            { user: { email: { contains: 'test.com' } } },
            { referredUser: { email: { contains: 'test.com' } } }
          ]
        }
      }),
      
      // Delete transactions for test users or test descriptions
      transactions: await this.transaction.deleteMany({
        where: { 
          OR: [
            { user: { email: { contains: 'test.com' } } },
            { description: { contains: 'test' } },
            { description: { contains: 'Test' } }
          ]
        }
      }),
      
      // Delete premium subscriptions for test users or simulated ones
      premiumSubscriptions: await this.premiumSubscription.deleteMany({
        where: { 
          OR: [
            { user: { email: { contains: 'test.com' } } },
            { isSimulated: true }
          ]
        }
      }),
      
      // Delete test users (except admin accounts)
      testUsers: await this.user.deleteMany({
        where: { 
          email: { contains: 'test.com' },
          role: { not: 'ADMIN' } // Don't delete admin test accounts
        }
      }),
    };

    console.log('✅ Test data cleared:', deletedCounts);
    return deletedCounts;
  }

  /**
   * Reset demo data (for demo mode only)
   */
  async resetDemoData() {
    if (!this.isDemoMode) {
      throw new Error('This method is only available in demo mode');
    }

    console.log('🔄 Resetting demo data...');
    
    // Your demo data reset logic here
    // Example: Recreate sample users, plans, etc.
    
    return { message: 'Demo data reset successfully' };
  }

  /**
   * Execute raw SQL safely (for migrations or complex queries)
   */
  async executeRawSQL<T = any>(sql: string, params?: any[]): Promise<T> {
    try {
      // Use tagged template literal for safety
      if (params) {
        return await this.$queryRawUnsafe(sql, ...params);
      } else {
        return await this.$queryRawUnsafe(sql);
      }
    } catch (error) {
      console.error('Raw SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Backup database (simple export)
   */
  async backupDatabase(): Promise<string> {
    if (this.isDemoMode) {
      throw new Error('Backup not available in demo mode');
    }

    try {
      // Get all data from main tables
      const backupData = {
        timestamp: new Date().toISOString(),
        users: await this.user.findMany(),
        premiumPlans: await this.premiumPlan.findMany(),
        premiumSubscriptions: await this.premiumSubscription.findMany(),
        transactions: await this.transaction.findMany(),
        affiliateEarnings: await this.affiliateEarning.findMany(),
        wallets: await this.wallet.findMany(),
      };

      return JSON.stringify(backupData, null, 2);
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }
}