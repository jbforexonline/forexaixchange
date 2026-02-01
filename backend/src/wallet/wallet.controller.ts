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
  @ApiOperation({ summary: 'Create internal transfer - DISABLED' })
  @ApiResponse({ status: 403, description: 'Internal transfers are disabled' })
  async createTransfer(@Body() createTransferDto: CreateTransferDto, @CurrentUser() user: any) {
    // SECURITY: Internal transfers are disabled by default
    // Feature flag must be explicitly enabled AND this code path should NEVER be reached in production
    const transfersEnabled = process.env.TRANSFERS_ENABLED === 'true';
    if (!transfersEnabled) {
      throw new ForbiddenException(
        'Internal transfers between users are permanently disabled. ' +
        'Please use deposits and withdrawals through official channels.'
      );
    }

    // Even if flag is enabled, block this endpoint in production
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Internal transfers are not available in production environment.'
      );
    }

    throw new ForbiddenException('Internal transfers are disabled.');
  }

  @Get('transfer/search')
  @ApiOperation({ summary: 'Search users for transfer - DISABLED' })
  @ApiResponse({ status: 403, description: 'Internal transfers are disabled' })
  async searchUsersForTransfer(
    @Query('q') query: string,
    @CurrentUser() user: any,
  ) {
    // SECURITY: Internal transfers are disabled
    throw new ForbiddenException(
      'Internal transfers between users are permanently disabled.'
    );
  }

  @Get('transfer/:transferId')
  @ApiOperation({ summary: 'Get transfer details - DISABLED' })
  @ApiResponse({ status: 403, description: 'Internal transfers are disabled' })
  async getTransfer(
    @Param('transferId') transferId: string,
    @CurrentUser() user: any,
  ) {
    // SECURITY: Internal transfers are disabled
    throw new ForbiddenException(
      'Internal transfers between users are permanently disabled.'
    );
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
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
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
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get pending transactions (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending transactions retrieved successfully' })
  async getPendingTransactions() {
    return this.transactionsService.getPendingTransactions();
  }

  @Post('admin/transactions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Approve transaction (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction approved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approveTransaction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processWithdrawal(id, true, user.id);
  }

  @Post('admin/transactions/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Reject transaction (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction rejected successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async rejectTransaction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processWithdrawal(id, false, user.id);
  }

  @Get('admin/transfers')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get internal transfers - DISABLED (legacy endpoint)' })
  @ApiResponse({ status: 403, description: 'Internal transfers are disabled' })
  async getInternalTransfers(@Query('status') status?: string) {
    // SECURITY: Internal transfers are disabled - return empty for legacy compatibility
    // This endpoint exists only to prevent 404s from legacy clients
    return { 
      message: 'Internal transfers are permanently disabled',
      transfers: [],
      count: 0 
    };
  }

  @Post('admin/transfers/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve internal transfer - DISABLED' })
  @ApiResponse({ status: 403, description: 'Internal transfers are disabled' })
  async approveTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    // SECURITY: Internal transfers are disabled
    throw new ForbiddenException(
      'Internal transfers are permanently disabled. Cannot approve transfers.'
    );
  }

  @Post('admin/transfers/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject internal transfer - DISABLED' })
  @ApiResponse({ status: 403, description: 'Internal transfers are disabled' })
  async rejectTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    // SECURITY: Internal transfers are disabled
    throw new ForbiddenException(
      'Internal transfers are permanently disabled. Cannot reject transfers.'
    );
  }
  
  @Post('demo/reset')
  @ApiOperation({ summary: 'Reset demo wallet balance to starting amount' })
  @ApiResponse({ status: 200, description: 'Demo balance reset successfully' })
  async resetDemoBalance(
    @CurrentUser() user: any,
    @Body('amount') amount: number,
  ) {
    return this.walletService.resetDemoBalance(user.id, amount || 10000);
  }
}
