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
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionsService } from './transactions.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get full wallet details' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  async getWallet(@CurrentUser() user: any) {
    return this.walletService.getWallet(user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@CurrentUser() user: any) {
    return this.walletService.getBalance(user.id);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Create deposit request' })
  @ApiResponse({ status: 201, description: 'Deposit request created successfully' })
  async createDeposit(@Body() createDepositDto: CreateDepositDto, @CurrentUser() user: any) {
    try {
      const amount = new Decimal(createDepositDto.amount);
      return this.walletService.deposit(
        user.id,
        amount,
        createDepositDto.method,
        createDepositDto.reference,
        createDepositDto.idempotencyKey,
      );
    } catch (error) {
      console.error('❌ Deposit error:', error);
      // Detect missing DB/tables (Prisma) and return friendly 503 in demo mode
      const msg = String(error?.message || error);
      const code = error?.code || error?.meta?.code;
      if (msg.includes('does not exist') || code === 'P2021' || code === 'P1001') {
        throw new HttpException({
          message: 'Wallet service unavailable: database not ready (demo mode).',
          detail: process.env.NODE_ENV === 'development' ? msg : undefined,
        }, HttpStatus.SERVICE_UNAVAILABLE);
      }

      throw error;
    }
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Create withdrawal request' })
  @ApiResponse({ status: 201, description: 'Withdrawal request created successfully' })
  async createWithdrawal(@Body() createWithdrawalDto: CreateWithdrawalDto, @CurrentUser() user: any) {
    try {
      const amount = new Decimal(createWithdrawalDto.amount);
      return this.walletService.withdraw(
        user.id,
        amount,
        createWithdrawalDto.method,
        createWithdrawalDto.reference,
        createWithdrawalDto.idempotencyKey,
      );
    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      const msg = String(error?.message || error);
      const code = error?.code || error?.meta?.code;
      if (msg.includes('does not exist') || code === 'P2021' || code === 'P1001') {
        throw new HttpException({
          message: 'Withdrawal service unavailable: database not ready (demo mode).',
          detail: process.env.NODE_ENV === 'development' ? msg : undefined,
        }, HttpStatus.SERVICE_UNAVAILABLE);
      }

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
    const recipient = await this.walletService.findUserByIdentifier(createTransferDto.recipient);

    if (!recipient) {
      throw new NotFoundException('Recipient not found. Search by username, ID, or email.');
    }

    // Create transfer
    const transfer = await this.walletService.transferFunds(
      user.id,
      recipient.id,
      amount,
      createTransferDto.feePayer,
      createTransferDto.idempotencyKey,
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

    const users = await this.walletService.searchUsers(query, user.id);

    return users;
  }

  @Get('transfer/:transferId')
  @ApiOperation({ summary: 'Get transfer details with recipient info (Premium only)' })
  @ApiResponse({ status: 200, description: 'Transfer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async getTransfer(
    @Param('transferId') transferId: string,
    @CurrentUser() user: any,
  ) {
    // Premium-only feature
    if (!user.premium || (user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date())) {
      throw new ForbiddenException('This feature is available to premium users only');
    }

    return this.walletService.getTransferWithRecipient(transferId, user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get user transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getUserTransactions(
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('type') type?: TransactionType,
  ) {
    return this.transactionsService.getUserTransactions(user.id, page, limit, type);
  }

  // Admin endpoints
  @Get('admin/transactions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
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
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get pending transactions (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending transactions retrieved successfully' })
  async getPendingTransactions() {
    return this.transactionsService.getPendingTransactions();
  }

  @Post('admin/transactions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve transaction (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction approved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approveTransaction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processWithdrawal(id, true, user.id);
  }

  @Post('admin/transactions/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject transaction (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction rejected successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async rejectTransaction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processWithdrawal(id, false, user.id);
  }

  @Get('admin/transfers')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get internal transfers (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transfers retrieved successfully' })
  async getInternalTransfers() {
    return this.walletService.getAllTransfers();
  }

  @Post('admin/transfers/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve internal transfer (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transfer approved successfully' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async approveTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processTransfer(id, true, user.id);
  }

  @Post('admin/transfers/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject internal transfer (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transfer rejected successfully' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async rejectTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processTransfer(id, false, user.id);
  }
}
