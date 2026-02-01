import { PrismaClient, UserRole, KycStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const AGE_SEED = {
  isAge18Confirmed: true,
  ageConfirmedAt: new Date(),
  ageConfirmedIp: '127.0.0.1',
  ageConfirmedUserAgent: 'Seed',
};

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
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      isVerified: true,
      verificationBadge: true,
      kycStatus: KycStatus.APPROVED,
      premium: true,
      ...AGE_SEED,
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
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      verificationBadge: true,
      kycStatus: KycStatus.APPROVED,
      premium: true,
      ...AGE_SEED,
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

  // Create Test Users with Money
  const testUsers = [
    {
      email: 'user1@test.com',
      phone: '+1234567892',
      username: 'testuser1',
      firstName: 'Test',
      lastName: 'User 1',
      password: await bcrypt.hash('password123', 12),
      available: 2500,
      premium: true,
    },
    {
      email: 'user2@test.com',
      phone: '+1234567893',
      username: 'testuser2',
      firstName: 'Test',
      lastName: 'User 2',
      password: await bcrypt.hash('password123', 12),
      available: 1500,
      premium: false,
    },
    {
      email: 'premium@test.com',
      phone: '+1234567894',
      username: 'premiumuser',
      firstName: 'Premium',
      lastName: 'User',
      password: await bcrypt.hash('password123', 12),
      available: 10000,
      premium: true,
    },
    {
      email: 'demo@forexaixchange.com',
      phone: '+1234567895',
      username: 'demouser',
      firstName: 'Demo',
      lastName: 'User',
      password: await bcrypt.hash('password123', 12),
      available: 0,
      premium: false,
    },
  ];

  for (const userData of testUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: UserRole.USER,
        isActive: true,
        isVerified: true,
        verificationBadge: userData.premium,
        kycStatus: KycStatus.APPROVED,
        premium: userData.premium,
        ...AGE_SEED,
        wallet: {
          create: {
            available: userData.available,
            held: 0,
            totalDeposited: userData.available,
            totalWithdrawn: 0,
            totalWon: 0,
            totalLost: 0,
          },
        },
      },
    });
  }

  // Legal: Terms & Privacy v1.0 (active)
  console.log('📄 Creating legal documents...');
  const terms = await prisma.legalDocument.upsert({
    where: { type_version: { type: 'TERMS', version: '1.0' } },
    update: { isActive: true },
    create: {
      type: 'TERMS',
      version: '1.0',
      content: `# Terms & Conditions v1.0

Welcome to ForexAI Exchange. By using this platform you agree to these terms.

## Eligibility
You must be 18 or older to use this service.

## Acceptance
By registering you confirm you have read and accepted these terms.`,
      effectiveAt: new Date(),
      isActive: true,
      createdByAdminId: superAdmin.id,
    },
  });
  console.log(`✅ Terms document created/updated: ID=${terms.id}, Active=${terms.isActive}`);
  const privacy = await prisma.legalDocument.upsert({
    where: { type_version: { type: 'PRIVACY', version: '1.0' } },
    update: { isActive: true },
    create: {
      type: 'PRIVACY',
      version: '1.0',
      content: `# Privacy Policy v1.0

We collect and process your data in accordance with applicable laws.

## Data we collect
- Account and profile information
- Usage and transaction data

## Your rights
You may request access or deletion of your data.`,
      effectiveAt: new Date(),
      isActive: true,
      createdByAdminId: superAdmin.id,
    },
  });
  console.log(`✅ Privacy document created/updated: ID=${privacy.id}, Active=${privacy.isActive}`);

  const seededEmails = [
    'superadmin@forexaixchange.com',
    'admin@forexaixchange.com',
    'user1@test.com',
    'user2@test.com',
    'premium@test.com',
    'demo@forexaixchange.com',
  ];
  for (const email of seededEmails) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) continue;
    await prisma.userLegalAcceptance.upsert({
      where: { userId_legalDocumentId: { userId: u.id, legalDocumentId: terms.id } },
      update: {},
      create: { userId: u.id, legalDocumentId: terms.id, ipAddress: '127.0.0.1', userAgent: 'Seed' },
    });
    await prisma.userLegalAcceptance.upsert({
      where: { userId_legalDocumentId: { userId: u.id, legalDocumentId: privacy.id } },
      update: {},
      create: { userId: u.id, legalDocumentId: privacy.id, ipAddress: '127.0.0.1', userAgent: 'Seed' },
    });
  }
  console.log('✅ Legal documents (Terms & Privacy v1.0) and seeded user acceptances created.');

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

  // =========================================================================
  // FINANCE SYSTEM v2 - Initialize Ledger Accounts & Configuration
  // =========================================================================
  console.log('🏦 Initializing Finance System v2...');

  // Create System Ledger Accounts (Simplified: No RESERVE_FUND - solvency tracked via Bank Balance / User Liabilities)
  const systemAccounts = [
    { id: 'SYS_HOUSE_PROFIT', type: 'HOUSE_PROFIT', name: 'House Profit - Round settlement profits' },
    { id: 'SYS_OPERATING_CAPITAL', type: 'OPERATING_CAPITAL', name: 'Operating Capital (Treasury) - Bank connected' },
    { id: 'SYS_CLEARING', type: 'CLEARING', name: 'Clearing - Temp holding during settlements' },
    { id: 'SYS_FEE_COLLECTION', type: 'FEE_COLLECTION', name: 'Fee Collection - 2% platform fees' },
  ];

  // Initial balances for house accounts
  const accountBalances: Record<string, number> = {
    'SYS_HOUSE_PROFIT': 5000,       // $5,000 accumulated profit
    'SYS_OPERATING_CAPITAL': 15000, // $15,000 treasury (increased since no reserve fund)
    'SYS_CLEARING': 0,              // Clearing always starts at 0
    'SYS_FEE_COLLECTION': 500,      // $500 in collected fees
  };

  for (const account of systemAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { id: account.id },
      update: { balance: accountBalances[account.id] || 0 },
      create: {
        id: account.id,
        type: account.type as any,
        ownerId: null,
        name: account.name,
        currency: 'USD',
        isActive: true,
        balance: accountBalances[account.id] || 0,
      },
    });
  }
  console.log('✅ System ledger accounts created with initial balances');

  // Create Fee Configuration
  const feeConfigs = [
    {
      feeType: 'WITHDRAWAL',
      tiers: JSON.stringify([
        { minAmount: 0, maxAmount: 50, feeAmount: 1, feePercent: 0 },
        { minAmount: 50, maxAmount: 100, feeAmount: 2, feePercent: 0 },
        { minAmount: 100, maxAmount: 500, feeAmount: 3, feePercent: 0 },
        { minAmount: 500, maxAmount: 2000, feeAmount: 6, feePercent: 0 },
        { minAmount: 2000, maxAmount: null, feeAmount: 0, feePercent: 1 },
      ]),
      minFee: 1,
      maxFee: null,
      premiumDiscount: 100, // 100% discount for premium = free
    },
    {
      feeType: 'DEPOSIT',
      tiers: JSON.stringify([]),
      minFee: 0,
      maxFee: null,
      premiumDiscount: 0,
    },
  ];

  for (const config of feeConfigs) {
    await prisma.feeConfiguration.upsert({
      where: { feeType: config.feeType },
      update: {},
      create: {
        feeType: config.feeType,
        tiers: config.tiers,
        minFee: config.minFee,
        maxFee: config.maxFee,
        premiumDiscount: config.premiumDiscount,
        updatedBy: superAdmin.id,
      },
    });
  }
  console.log('✅ Fee configurations created');

  // Create Withdrawal Limits
  const withdrawalLimits = [
    {
      limitType: 'FREE_DAILY',
      dailyLimit: 500,
      singleTransactionMax: 250,
      largeWithdrawalThreshold: 200,
    },
    {
      limitType: 'PREMIUM_DAILY',
      dailyLimit: 10000,
      singleTransactionMax: 5000,
      largeWithdrawalThreshold: 1000,
    },
  ];

  for (const limit of withdrawalLimits) {
    await prisma.withdrawalLimit.upsert({
      where: { limitType: limit.limitType },
      update: {},
      create: {
        limitType: limit.limitType,
        dailyLimit: limit.dailyLimit,
        singleTransactionMax: limit.singleTransactionMax,
        largeWithdrawalThreshold: limit.largeWithdrawalThreshold,
        updatedBy: superAdmin.id,
      },
    });
  }
  console.log('✅ Withdrawal limits created');

  // Create Initial Bank Snapshot (for reserve ratio)
  await prisma.bankSnapshot.upsert({
    where: { id: 'initial-snapshot' },
    update: {},
    create: {
      id: 'initial-snapshot',
      bankBalance: 50000, // $50,000 initial bank balance
      bankAccountRef: 'SEED_INITIAL',
      totalUserLiabilities: 29000, // Sum of seeded user wallets
      reserveRatio: 1.72, // 50000 / 29000 = 1.72 (HEALTHY)
      minRatioThreshold: 1.1,
      warningRatioThreshold: 1.2,
      isWithdrawalsLocked: false,
      isLargeWithdrawalsPaused: false,
      createdBy: superAdmin.id,
      notes: 'Initial seed snapshot',
    },
  });
  console.log('✅ Initial bank snapshot created (Reserve Ratio: 172%)');

  // Create Finance Admin user
  const financeAdminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'finance@forexaixchange.com' },
    update: {},
    create: {
      email: 'finance@forexaixchange.com',
      phone: '+1234567896',
      password: financeAdminPassword,
      username: 'financeadmin',
      firstName: 'Finance',
      lastName: 'Admin',
      role: 'FINANCE_ADMIN' as any,
      isActive: true,
      isVerified: true,
      verificationBadge: true,
      kycStatus: KycStatus.APPROVED,
      premium: true,
      ...AGE_SEED,
      wallet: {
        create: {
          available: 0,
          held: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalWon: 0,
          totalLost: 0,
        },
      },
    },
  });
  console.log('✅ Finance Admin user created');

  console.log('🏦 Finance System v2 initialized!');
  console.log('');

  console.log('✅ Database seeding completed!');
  console.log('');
  console.log('👑 ADMIN ACCOUNTS:');
  console.log('📧 Super Admin Email: superadmin@forexaixchange.com');
  console.log('📱 Super Admin Phone: +1234567890');
  console.log('🔑 Super Admin Password: admin123');
  console.log('💰 Super Admin Balance: $10,000');
  console.log('');
  console.log('📧 Admin Email: admin@forexaixchange.com');
  console.log('📱 Admin Phone: +1234567891');
  console.log('🔑 Admin Password: admin123');
  console.log('💰 Admin Balance: $5,000');
  console.log('');
  console.log('📧 Finance Admin Email: finance@forexaixchange.com');
  console.log('📱 Finance Admin Phone: +1234567896');
  console.log('🔑 Finance Admin Password: admin123');
  console.log('🏦 Finance Admin can approve deposits/withdrawals');
  console.log('');
  console.log('👤 TEST USER ACCOUNTS:');
  console.log('📧 User 1 Email: user1@test.com | Phone: +1234567892 | Password: password123 | Balance: $2,500 (Premium)');
  console.log('📧 User 2 Email: user2@test.com | Phone: +1234567893 | Password: password123 | Balance: $1,500 (Regular)');
  console.log('📧 Premium User Email: premium@test.com | Phone: +1234567894 | Password: password123 | Balance: $10,000 (Premium)');
  console.log('📧 Demo User Email: demo@forexaixchange.com | Phone: +1234567895 | Password: password123 | Balance: $0 (Regular)');
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
