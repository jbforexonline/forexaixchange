import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
}
