import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionsService } from './transactions.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UserRole, TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionsService: TransactionsService,
  ) {}

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
      console.log('🔍 Controller deposit request:', { user: user?.id, dto: createDepositDto });
      const amount = new Decimal(createDepositDto.amount);
      return this.walletService.deposit(user.id, amount, createDepositDto.method, createDepositDto.reference);
    } catch (error) {
      console.error('❌ Deposit error:', error);
      throw error;
    }
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Create withdrawal request' })
  @ApiResponse({ status: 201, description: 'Withdrawal request created successfully' })
  async createWithdrawal(@Body() createWithdrawalDto: CreateWithdrawalDto, @CurrentUser() user: any) {
    try {
      console.log('🔍 Controller withdrawal request:', { user: user?.id, dto: createWithdrawalDto });
      const amount = new Decimal(createWithdrawalDto.amount);
      return this.walletService.withdraw(user.id, amount, createWithdrawalDto.method, createWithdrawalDto.reference);
    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      throw error;
    }
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create internal transfer' })
  @ApiResponse({ status: 201, description: 'Transfer request created successfully' })
  async createTransfer(@Body() createTransferDto: CreateTransferDto, @CurrentUser() user: any) {
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

    return this.walletService.transferFunds(user.id, recipient.id, amount, createTransferDto.feePayer);
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pending transactions (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending transactions retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getPendingTransactions() {
    return this.transactionsService.getPendingTransactions();
  }

  @Post('admin/transactions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve transaction (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async approveTransaction(@Param('id') id: string) {
    return this.walletService.processWithdrawal(id, true);
  }

  @Post('admin/transactions/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject transaction (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async rejectTransaction(@Param('id') id: string) {
    return this.walletService.processWithdrawal(id, false);
  }

  @Get('admin/transfers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get internal transfers (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transfers retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve internal transfer (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transfer approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async approveTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processTransfer(id, true, user.id);
  }

  @Post('admin/transfers/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject internal transfer (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transfer rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async rejectTransfer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.walletService.processTransfer(id, false, user.id);
  }
}
