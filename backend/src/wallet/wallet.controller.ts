import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionsService } from './transactions.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@Body() body: any) {
    const userId = body.userId || 'default-user';
    return this.walletService.getBalance(userId);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Create deposit request' })
  @ApiResponse({ status: 201, description: 'Deposit request created successfully' })
  async createDeposit(@Body() createDepositDto: CreateDepositDto) {
    try {
      const userId = createDepositDto['userId'] || 'default-user';
      console.log('🔍 Controller deposit request:', { user: userId, dto: createDepositDto });
      const amount = new Decimal(createDepositDto.amount);
      return this.walletService.deposit(userId, amount, createDepositDto.method, createDepositDto.reference);
    } catch (error) {
      console.error('❌ Deposit error:', error);
      throw error;
    }
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Create withdrawal request' })
  @ApiResponse({ status: 201, description: 'Withdrawal request created successfully' })
  async createWithdrawal(@Body() createWithdrawalDto: CreateWithdrawalDto) {
    try {
      const userId = createWithdrawalDto['userId'] || 'default-user';
      console.log('🔍 Controller withdrawal request:', { user: userId, dto: createWithdrawalDto });
      const amount = new Decimal(createWithdrawalDto.amount);
      return this.walletService.withdraw(userId, amount, createWithdrawalDto.method, createWithdrawalDto.reference);
    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      throw error;
    }
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create internal transfer (Premium only)' })
  @ApiResponse({ status: 201, description: 'Transfer request created successfully' })
  @ApiResponse({ status: 403, description: 'Premium subscription required' })
  async createTransfer(@Body() createTransferDto: CreateTransferDto, @CurrentUser() user: any) {
    // Premium-only feature
    if (!user.premium || (user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date())) {
      throw new ForbiddenException('Internal transfers are available to premium users only');
    }

    const amount = new Decimal(createTransferDto.amount);
    
    // Find recipient by username, ID, or email (for contact purposes)
    const recipient = await this.walletService['prisma'].user.findFirst({
      where: {
        OR: [
          { username: createTransferDto.recipient },
          { id: createTransferDto.recipient },
          { email: createTransferDto.recipient },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        verificationBadge: true,
        premium: true,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found. Search by username, ID, or email.');
    }

    // Create transfer
    const transfer = await this.walletService.transferFunds(
      user.id,
      recipient.id,
      amount,
      createTransferDto.feePayer,
    );

    // Return transfer with recipient email for contact
    return {
      ...transfer,
      recipient: {
        id: recipient.id,
        username: recipient.username,
        email: recipient.email, // Allow contact via email
        isVerified: recipient.verificationBadge,
        isPremium: recipient.premium,
      },
    };
  }

  @Get('transfer/search')
  @ApiOperation({ summary: 'Search users for transfer by username or email (Premium only)' })
  @ApiResponse({ status: 200, description: 'Users found' })
  @ApiQuery({ name: 'q', description: 'Search by username or email' })
  async searchUsersForTransfer(
    @Query('q') query: string,
    @CurrentUser() user: any,
  ) {
    // Premium-only feature
    if (!user.premium || (user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date())) {
      throw new ForbiddenException('This feature is available to premium users only');
    }

    if (!query || query.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const users = await this.walletService['prisma'].user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        id: { not: user.id }, // Exclude current user
        isActive: true,
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        verificationBadge: true,
        premium: true,
        isVerified: true,
      },
      take: 10, // Limit results
    });

    return users;
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get user transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getUserTransactions(
    @Query('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('type') type?: TransactionType,
  ) {
    const id = userId || 'default-user';
    return this.transactionsService.getUserTransactions(id, page, limit, type);
  }

  // Admin endpoints (NO AUTH)
  @Get('admin/transactions')
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getAllTransactions(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
  ) {
    return this.transactionsService.getAllTransactions(page, limit, status, type);
  }

  @Get('admin/transactions/pending')
  @ApiOperation({ summary: 'Get pending transactions' })
  @ApiResponse({ status: 200, description: 'Pending transactions retrieved successfully' })
  async getPendingTransactions() {
    return this.transactionsService.getPendingTransactions();
  }

  @Post('admin/transactions/:id/approve')
  @ApiOperation({ summary: 'Approve transaction' })
  @ApiResponse({ status: 200, description: 'Transaction approved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approveTransaction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processWithdrawal(id, true, user.id);
  }

  @Post('admin/transactions/:id/reject')
  @ApiOperation({ summary: 'Reject transaction' })
  @ApiResponse({ status: 200, description: 'Transaction rejected successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async rejectTransaction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processWithdrawal(id, false, user.id);
  }

  @Get('admin/transfers')
  @ApiOperation({ summary: 'Get internal transfers' })
  @ApiResponse({ status: 200, description: 'Transfers retrieved successfully' })
  async getInternalTransfers() {
    return this.walletService['prisma'].internalTransfer.findMany({
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        recipient: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('admin/transfers/:id/approve')
  @ApiOperation({ summary: 'Approve internal transfer' })
  @ApiResponse({ status: 200, description: 'Transfer approved successfully' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async approveTransfer(@Param('id') id: string, @Body() body: any) {
    const userId = body.userId || 'default-admin';
    return this.walletService.processTransfer(id, true, userId);
  }

  @Post('admin/transfers/:id/reject')
  @ApiOperation({ summary: 'Reject internal transfer' })
  @ApiResponse({ status: 200, description: 'Transfer rejected successfully' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async rejectTransfer(@Param('id') id: string, @Body() body: any) {
    const userId = body.userId || 'default-admin';
    return this.walletService.processTransfer(id, false, userId);
  }
}
