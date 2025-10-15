import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, KycStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          wallet: true,
          _count: {
            select: {
              referrals: true,
              spins: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    return {
      data: usersWithoutPasswords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        referrer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        referrals: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            spins: true,
            transactions: true,
            affiliateEarnings: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only super admin can update other users, or users can update themselves (limited fields)
    if (currentUser.id !== id && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // If not super admin, limit updatable fields
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      const { role, isActive, isBanned, isVerified, verificationBadge, ...allowedFields } = updateUserDto;
      return this.prisma.user.update({
        where: { id },
        data: allowedFields,
        include: {
          wallet: true,
        },
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        wallet: true,
      },
    });
  }

  async banUser(id: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        isActive: false,
      },
    });
  }

  async unbanUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        isActive: true,
      },
    });
  }

  async approveKyc(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        kycStatus: KycStatus.APPROVED,
        isVerified: true,
        verificationBadge: true,
      },
    });
  }

  async rejectKyc(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        kycStatus: KycStatus.REJECTED,
      },
    });
  }

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      premiumUsers,
      verifiedUsers,
      totalDeposits,
      totalWithdrawals,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.user.count({ where: { premium: true } }),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.wallet.aggregate({
        _sum: { totalDeposited: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: { totalWithdrawn: true },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      premiumUsers,
      verifiedUsers,
      totalDeposits: totalDeposits._sum.totalDeposited || 0,
      totalWithdrawals: totalWithdrawals._sum.totalWithdrawn || 0,
    };
  }
}
