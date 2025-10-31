import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionsService } from './transactions.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
  @ApiOperation({ summary: 'Create internal transfer' })
  @ApiResponse({ status: 201, description: 'Transfer request created successfully' })
  async createTransfer(@Body() createTransferDto: CreateTransferDto) {
    const userId = createTransferDto['userId'] || 'default-user';
    const amount = new Decimal(createTransferDto.amount);
    
    // Find recipient by username or ID
    const recipient = await this.walletService['prisma'].user.findFirst({
      where: {
        OR: [
          { username: createTransferDto.recipient },
          { id: createTransferDto.recipient },
        ],
      },
    });

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    return this.walletService.transferFunds(userId, recipient.id, amount, createTransferDto.feePayer);
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
  async approveTransaction(@Param('id') id: string) {
    return this.walletService.processWithdrawal(id, true);
  }

  @Post('admin/transactions/:id/reject')
  @ApiOperation({ summary: 'Reject transaction' })
  @ApiResponse({ status: 200, description: 'Transaction rejected successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async rejectTransaction(@Param('id') id: string) {
    return this.walletService.processWithdrawal(id, false);
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
