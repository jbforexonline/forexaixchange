import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      premiumUsers,
      totalDeposits,
      totalWithdrawals,
      totalSpins,
      totalTransactions,
      pendingWithdrawals,
      pendingTransfers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.user.count({ where: { premium: true } }),
      this.prisma.wallet.aggregate({ _sum: { totalDeposited: true } }),
      this.prisma.wallet.aggregate({ _sum: { totalWithdrawn: true } }),
      this.prisma.spin.count(),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({
        where: {
          type: 'WITHDRAWAL',
          status: 'PENDING',
        },
      }),
      this.prisma.internalTransfer.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        premium: premiumUsers,
      },
      financial: {
        totalDeposits: totalDeposits._sum.totalDeposited || 0,
        totalWithdrawals: totalWithdrawals._sum.totalWithdrawn || 0,
        pendingWithdrawals,
        pendingTransfers,
      },
      activity: {
        totalSpins,
        totalTransactions,
      },
    };
  }

  async getSystemConfig() {
    return this.prisma.systemConfig.findMany({
      where: { isPublic: false },
      orderBy: { key: 'asc' },
    });
  }

  async getSystemConfigByKey(key: string) {
    return this.prisma.systemConfig.findUnique({
      where: { key },
    });
  }

  async updateSystemConfig(key: string, value: string, updatedBy: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy },
      create: {
        key,
        value,
        updatedBy,
        isPublic: false,
      },
    });
  }

  async getRecentActivity(limit = 20) {
    const [recentUsers, recentSpins, recentTransactions] = await Promise.all([
      this.prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      }),
      this.prisma.spin.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      }),
      this.prisma.transaction.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);

    return {
      recentUsers,
      recentSpins,
      recentTransactions,
    };
  }

  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total, active, premium, banned] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
          referrer: {
            select: { username: true, email: true }
          },
          _count: {
            select: {
              referrals: true,
              spins: true,
              transactions: true,
              premiumSubscriptions: true,
            }
          }
        },
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, isActive: true, isBanned: false } }),
      this.prisma.user.count({ where: { ...where, premium: true } }),
      this.prisma.user.count({ where: { ...where, isBanned: true } }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: {
          active,
          premium,
          banned,
        },
      },
    };
  }

  async updateUser(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: { wallet: true },
    });
  }

  async getAllTransactions(page = 1, limit = 20, type?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { username: true, email: true }
          }
        }
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async getAllSpins(page = 1, limit = 20, isDemo?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (typeof isDemo === 'boolean') where.isDemo = isDemo;

    const [spins, total] = await Promise.all([
      this.prisma.spin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { username: true, email: true }
          }
        }
      }),
      this.prisma.spin.count({ where }),
    ]);

    return {
      data: spins,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }
}
