// =============================================================================
// ADMIN FINANCE CONTROLLER - Admin-only finance endpoints
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { DepositService } from './deposit.service';
import { WithdrawalService } from './withdrawal.service';
import { ReserveService, ReserveStatus, HouseAccountStatus } from './reserve.service';
import { DepositStatus, WithdrawalStatus, AdminActionType } from '@prisma/client';

// DTOs
class ProcessDepositDto {
  reason?: string;
}

class ProcessWithdrawalDto {
  reason?: string;
  payoutReference?: string;
}

class UpdateBankBalanceDto {
  bankBalance: number;
  bankAccountRef?: string;
  notes?: string;
}

class CreateDepositForUserDto {
  userId: string;
  amount: number;
  method: string;
  referenceId?: string;
  paymentProof?: string;
}

class HouseTransferDto {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reason: string;
}

class HouseWithdrawDto {
  fromAccountId: string;
  amount: number;
  bankReference?: string;
  reason: string;
}

class HouseDepositDto {
  toAccountId: string;
  amount: number;
  bankReference?: string;
  reason: string;
}

@ApiTags('Admin Finance')
@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminFinanceController {
  constructor(
    private depositService: DepositService,
    private withdrawalService: WithdrawalService,
    private reserveService: ReserveService,
  ) {}

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get finance dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard() {
    return this.reserveService.getDashboardSummary();
  }

  @Get('house')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get house account balances and reserve ratio' })
  @ApiResponse({ status: 200, description: 'House account status retrieved' })
  async getHouseStatus() {
    const [houseAccounts, reserveStatus] = await Promise.all([
      this.reserveService.getHouseAccountStatus(),
      this.reserveService.getReserveStatus(),
    ]);

    return {
      houseAccounts,
      reserveStatus,
    };
  }

  // ==========================================================================
  // DEPOSITS
  // ==========================================================================

  @Get('deposits')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get all deposits' })
  @ApiQuery({ name: 'status', required: false, enum: DepositStatus })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Deposits retrieved' })
  async getDeposits(
    @Query('status') status?: DepositStatus,
    @Query('userId') userId?: string,
    @Query('method') method?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.depositService.getAllDeposits({
      status,
      userId,
      method,
      limit,
      offset: (page - 1) * limit,
    });
  }

  @Get('deposits/pending')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get pending deposits requiring approval' })
  @ApiResponse({ status: 200, description: 'Pending deposits retrieved' })
  async getPendingDeposits() {
    return this.depositService.getAllDeposits({
      status: DepositStatus.PENDING,
    });
  }

  @Get('deposits/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get deposit by ID' })
  @ApiResponse({ status: 200, description: 'Deposit retrieved' })
  async getDeposit(@Param('id') id: string) {
    return this.depositService.getDeposit(id);
  }

  @Post('deposits')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Create deposit on behalf of user' })
  @ApiResponse({ status: 201, description: 'Deposit created' })
  async createDepositForUser(
    @Body() dto: CreateDepositForUserDto,
    @CurrentUser() admin: any,
  ) {
    return this.depositService.createDeposit({
      userId: dto.userId,
      amount: dto.amount,
      method: dto.method,
      referenceId: dto.referenceId,
      paymentProof: dto.paymentProof,
      createdByAdminId: admin.id,
    });
  }

  @Post('deposits/:id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Approve deposit and credit user balance' })
  @ApiResponse({ status: 200, description: 'Deposit approved and credited' })
  async approveDeposit(
    @Param('id') id: string,
    @Body() dto: ProcessDepositDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.depositService.processDeposit({
      depositId: id,
      adminId: admin.id,
      action: 'APPROVE',
      reason: dto.reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('deposits/:id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Reject deposit' })
  @ApiResponse({ status: 200, description: 'Deposit rejected' })
  async rejectDeposit(
    @Param('id') id: string,
    @Body() dto: ProcessDepositDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.depositService.processDeposit({
      depositId: id,
      adminId: admin.id,
      action: 'REJECT',
      reason: dto.reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==========================================================================
  // WITHDRAWALS
  // ==========================================================================

  @Get('withdrawals')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get all withdrawals' })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Withdrawals retrieved' })
  async getWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('userId') userId?: string,
    @Query('method') method?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.withdrawalService.getAllWithdrawals({
      status,
      userId,
      method,
      limit,
      offset: (page - 1) * limit,
    });
  }

  @Get('withdrawals/pending')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get withdrawals pending review' })
  @ApiResponse({ status: 200, description: 'Pending withdrawals retrieved' })
  async getPendingWithdrawals() {
    return this.withdrawalService.getAllWithdrawals({
      status: WithdrawalStatus.PENDING_REVIEW,
    });
  }

  @Get('withdrawals/approved')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get approved withdrawals awaiting payout' })
  @ApiResponse({ status: 200, description: 'Approved withdrawals retrieved' })
  async getApprovedWithdrawals() {
    return this.withdrawalService.getAllWithdrawals({
      status: WithdrawalStatus.APPROVED,
    });
  }

  @Get('withdrawals/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get withdrawal by ID' })
  @ApiResponse({ status: 200, description: 'Withdrawal retrieved' })
  async getWithdrawal(@Param('id') id: string) {
    return this.withdrawalService.getWithdrawal(id);
  }

  @Post('withdrawals/:id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Approve withdrawal' })
  @ApiResponse({ status: 200, description: 'Withdrawal approved' })
  async approveWithdrawal(
    @Param('id') id: string,
    @Body() dto: ProcessWithdrawalDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.withdrawalService.processWithdrawal({
      withdrawalId: id,
      adminId: admin.id,
      action: 'APPROVE',
      reason: dto.reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('withdrawals/:id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Reject withdrawal and refund held funds' })
  @ApiResponse({ status: 200, description: 'Withdrawal rejected and refunded' })
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body() dto: ProcessWithdrawalDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.withdrawalService.processWithdrawal({
      withdrawalId: id,
      adminId: admin.id,
      action: 'REJECT',
      reason: dto.reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('withdrawals/:id/pay')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Mark withdrawal as paid (after external payout)' })
  @ApiResponse({ status: 200, description: 'Withdrawal marked as paid' })
  async markWithdrawalPaid(
    @Param('id') id: string,
    @Body() dto: ProcessWithdrawalDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.withdrawalService.processWithdrawal({
      withdrawalId: id,
      adminId: admin.id,
      action: 'PAY',
      reason: dto.reason,
      payoutReference: dto.payoutReference,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ==========================================================================
  // RESERVE & BANK MANAGEMENT
  // ==========================================================================

  @Get('reserve')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get reserve ratio and status' })
  @ApiResponse({ status: 200, description: 'Reserve status retrieved' })
  async getReserveStatus() {
    return this.reserveService.getReserveStatus();
  }

  @Post('reserve/update')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Update bank balance and create snapshot' })
  @ApiResponse({ status: 201, description: 'Bank balance updated' })
  async updateBankBalance(
    @Body() dto: UpdateBankBalanceDto,
    @CurrentUser() admin: any,
  ) {
    return this.reserveService.updateBankBalance(
      dto.bankBalance,
      admin.id,
      dto.bankAccountRef,
      dto.notes,
    );
  }

  @Get('reserve/snapshots')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get bank snapshot history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Snapshots retrieved' })
  async getBankSnapshots(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 30,
  ) {
    return this.reserveService.getBankSnapshots(limit);
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  @Get('alerts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Get system alerts' })
  @ApiQuery({ name: 'acknowledged', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Alerts retrieved' })
  async getAlerts(
    @Query('acknowledged') acknowledged?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.reserveService.getAlerts({
      isAcknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
      limit,
      offset: (page - 1) * limit,
    });
  }

  @Post('alerts/:id/acknowledge')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Param('id') id: string,
    @CurrentUser() admin: any,
  ) {
    return this.reserveService.acknowledgeAlert(id, admin.id);
  }

  // ==========================================================================
  // AUDIT LOG
  // ==========================================================================

  @Get('audit/actions')
  @Roles('SUPER_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get admin action audit log' })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'targetUserId', required: false })
  @ApiQuery({ name: 'actionType', required: false, enum: AdminActionType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit log retrieved' })
  async getAuditLog(
    @Query('adminId') adminId?: string,
    @Query('targetUserId') targetUserId?: string,
    @Query('actionType') actionType?: AdminActionType,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 100,
  ) {
    return this.reserveService.getAdminActions({
      adminId,
      targetUserId,
      actionType,
      limit,
      offset: (page - 1) * limit,
    });
  }

  // ==========================================================================
  // HOUSE ACCOUNTS MANAGEMENT
  // ==========================================================================

  @Get('house/accounts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get detailed house account info with transactions' })
  @ApiResponse({ status: 200, description: 'House accounts with details retrieved' })
  async getHouseAccountsDetailed() {
    return this.reserveService.getHouseAccountsDetailed();
  }

  @Get('house/accounts/:accountId/transactions')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get transaction history for a house account' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async getHouseAccountTransactions(
    @Param('accountId') accountId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.reserveService.getHouseAccountTransactions(accountId, {
      limit,
      offset: (page - 1) * limit,
    });
  }

  @Post('house/transfer')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Transfer funds between house accounts' })
  @ApiResponse({ status: 201, description: 'Transfer completed' })
  async transferBetweenHouseAccounts(
    @Body() dto: HouseTransferDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.reserveService.transferBetweenHouseAccounts({
      fromAccountId: dto.fromAccountId,
      toAccountId: dto.toAccountId,
      amount: dto.amount,
      reason: dto.reason,
      adminId: admin.id,
      ipAddress: req.ip,
    });
  }

  @Post('house/withdraw-to-bank')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Withdraw from house account to external bank' })
  @ApiResponse({ status: 201, description: 'Withdrawal initiated' })
  async withdrawHouseToBank(
    @Body() dto: HouseWithdrawDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.reserveService.withdrawHouseToBank({
      fromAccountId: dto.fromAccountId,
      amount: dto.amount,
      bankReference: dto.bankReference,
      reason: dto.reason,
      adminId: admin.id,
      ipAddress: req.ip,
    });
  }

  @Post('house/deposit-from-bank')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Record deposit from external bank to house account' })
  @ApiResponse({ status: 201, description: 'Deposit recorded' })
  async depositHouseFromBank(
    @Body() dto: HouseDepositDto,
    @CurrentUser() admin: any,
    @Req() req: any,
  ) {
    return this.reserveService.depositHouseFromBank({
      toAccountId: dto.toAccountId,
      amount: dto.amount,
      bankReference: dto.bankReference,
      reason: dto.reason,
      adminId: admin.id,
      ipAddress: req.ip,
    });
  }

  // ==========================================================================
  // SETTLEMENTS & ANALYTICS
  // ==========================================================================

  @Get('settlements')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get round settlement history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Settlements retrieved' })
  async getSettlements(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.reserveService.getSettlements({ limit, offset: (page - 1) * limit });
  }

  @Get('settlements/summary')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get settlement analytics summary' })
  @ApiResponse({ status: 200, description: 'Settlement summary retrieved' })
  async getSettlementsSummary() {
    return this.reserveService.getSettlementsSummary();
  }

  @Get('platform-ledger')
  @Roles('SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'AUDIT_ADMIN')
  @ApiOperation({ summary: 'Get platform ledger entries (old system)' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Platform ledger retrieved' })
  async getPlatformLedger(
    @Query('type') type?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 100,
  ) {
    return this.reserveService.getPlatformLedger({ type, limit, offset: (page - 1) * limit });
  }
}
