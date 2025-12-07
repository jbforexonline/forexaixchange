import { PrismaClient, UserRole, KycStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@forexaixchange.com' },
    update: {},
    create: {
      email: 'superadmin@forexaixchange.com',
      phone: '+1234567890',
      password: superAdminPassword,
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      provider: 'local',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      isVerified: true,
      verificationBadge: true,
      kycStatus: KycStatus.APPROVED,
      premium: true,
      wallet: {
        create: {
          available: 10000,
          held: 0,
          totalDeposited: 10000,
          totalWithdrawn: 0,
          totalWon: 0,
          totalLost: 0,
        },
      },
    },
  });

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@forexaixchange.com' },
    update: {},
    create: {
      email: 'admin@forexaixchange.com',
      phone: '+1234567891',
      password: adminPassword,
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      provider: 'local',
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      verificationBadge: true,
      kycStatus: KycStatus.APPROVED,
      premium: true,
      wallet: {
        create: {
          available: 5000,
          held: 0,
          totalDeposited: 5000,
          totalWithdrawn: 0,
          totalWon: 0,
          totalLost: 0,
        },
      },
    },
  });

  // Create Premium Plans
  const premiumPlans = [
    {
      name: '1 Month Premium',
      duration: 1,
      price: 10,
      features: [
        'Verification badge',
        'Auto-press orders',
        'Unlimited withdrawals',
        'No withdrawal fees',
        'Access to member chatroom',
        'Early access to crypto & stock spin',
        '5/10/20 min spin cycles',
        'Auto-spin option',
      ],
    },
    {
      name: '6 Months Premium',
      duration: 6,
      price: 50,
      features: [
        'Verification badge',
        'Auto-press orders',
        'Unlimited withdrawals',
        'No withdrawal fees',
        'Access to member chatroom',
        'Early access to crypto & stock spin',
        '5/10/20 min spin cycles',
        'Auto-spin option',
        '17% savings',
      ],
    },
    {
      name: '1 Year Premium',
      duration: 12,
      price: 90,
      features: [
        'Verification badge',
        'Auto-press orders',
        'Unlimited withdrawals',
        'No withdrawal fees',
        'Access to member chatroom',
        'Early access to crypto & stock spin',
        '5/10/20 min spin cycles',
        'Auto-spin option',
        '25% savings',
      ],
    },
  ];

  for (const plan of premiumPlans) {
    const existingPlan = await prisma.premiumPlan.findFirst({
      where: { name: plan.name },
    });

    if (!existingPlan) {
      await prisma.premiumPlan.create({
        data: plan,
      });
    }
  }

  // Create System Configuration
  const systemConfigs = [
    {
      key: 'demo_mode',
      value: 'true',
      description: 'Enable/disable demo mode',
      isPublic: true,
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Enable/disable maintenance mode',
      isPublic: true,
    },
    {
      key: 'fake_user_count',
      value: '10000',
      description: 'Fake user count for display',
      isPublic: true,
    },
    {
      key: 'fake_active_users',
      value: '1250',
      description: 'Fake active users count',
      isPublic: true,
    },
    {
      key: 'fake_daily_spins',
      value: '45000',
      description: 'Fake daily spins count',
      isPublic: true,
    },
    {
      key: 'withdrawal_limit_free',
      value: '2000',
      description: 'Daily withdrawal limit for free users',
      isPublic: false,
    },
    {
      key: 'spin_countdown_free',
      value: '1200',
      description: 'Spin countdown for free users (seconds)',
      isPublic: false,
    },
    {
      key: 'spin_countdown_premium_5min',
      value: '300',
      description: '5-minute spin countdown for premium users',
      isPublic: false,
    },
    {
      key: 'spin_countdown_premium_10min',
      value: '600',
      description: '10-minute spin countdown for premium users',
      isPublic: false,
    },
    {
      key: 'spin_countdown_premium_20min',
      value: '1200',
      description: '20-minute spin countdown for premium users',
      isPublic: false,
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: {
        ...config,
        updatedBy: superAdmin.id,
      },
    });
  }

  console.log('✅ Database seeding completed!');
  console.log('📧 Super Admin Email: superadmin@forexaixchange.com');
  console.log('📱 Super Admin Phone: +1234567890');
  console.log('🔑 Super Admin Password: admin123');
  console.log('📧 Admin Email: admin@forexaixchange.com');
  console.log('📱 Admin Phone: +1234567891');
  console.log('🔑 Admin Password: admin123');
  console.log('');
  console.log('🔐 You can now login with either email OR phone number!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
