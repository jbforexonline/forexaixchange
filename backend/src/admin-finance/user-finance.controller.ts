// =============================================================================
// USER FINANCE CONTROLLER - User-facing deposit and withdrawal endpoints
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { DepositService } from './deposit.service';
import { WithdrawalService } from './withdrawal.service';
import { DepositStatus, WithdrawalStatus } from '@prisma/client';

// DTOs
class CreateDepositDto {
  amount: number;
  method: string;
  referenceId?: string;
  paymentProof?: string;
  idempotencyKey?: string;
}

class CreateWithdrawalDto {
  amount: number;
  payoutMethod: string;
  payoutDestination: string;
  idempotencyKey?: string;
}

class ConfirmWithdrawalDto {
  otpCode: string;
}

@ApiTags('User Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserFinanceController {
  constructor(
    private depositService: DepositService,
    private withdrawalService: WithdrawalService,
  ) {}

  // ==========================================================================
  // DEPOSITS
  // ==========================================================================

  @Post('deposits')
  @ApiOperation({ summary: 'Create deposit request' })
  @ApiResponse({ status: 201, description: 'Deposit request created - pending admin approval' })
  async createDeposit(
    @Body() dto: CreateDepositDto,
    @CurrentUser() user: any,
  ) {
    return this.depositService.createDeposit({
      userId: user.id,
      amount: dto.amount,
      method: dto.method,
      referenceId: dto.referenceId,
      paymentProof: dto.paymentProof,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get('deposits')
  @ApiOperation({ summary: 'Get my deposits' })
  @ApiQuery({ name: 'status', required: false, enum: DepositStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Deposits retrieved' })
  async getMyDeposits(
    @CurrentUser() user: any,
    @Query('status') status?: DepositStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.depositService.getUserDeposits(user.id, {
      status,
      limit,
      offset: (page - 1) * limit,
    });
  }

  @Get('deposits/:id')
  @ApiOperation({ summary: 'Get deposit by ID' })
  @ApiResponse({ status: 200, description: 'Deposit retrieved' })
  async getDeposit(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const deposit = await this.depositService.getDeposit(id);
    
    // Verify user owns this deposit
    if (deposit.userId !== user.id) {
      throw new Error('Not authorized to view this deposit');
    }
    
    return deposit;
  }

  // ==========================================================================
  // WITHDRAWALS
  // ==========================================================================

  @Post('withdrawals')
  @ApiOperation({ summary: 'Create withdrawal request (requires OTP confirmation)' })
  @ApiResponse({ status: 201, description: 'Withdrawal created in DRAFT status - OTP sent' })
  async createWithdrawal(
    @Body() dto: CreateWithdrawalDto,
    @CurrentUser() user: any,
  ) {
    return this.withdrawalService.createWithdrawal({
      userId: user.id,
      amount: dto.amount,
      payoutMethod: dto.payoutMethod,
      payoutDestination: dto.payoutDestination,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Post('withdrawals/:id/confirm')
  @ApiOperation({ summary: 'Confirm withdrawal with OTP (holds funds)' })
  @ApiResponse({ status: 200, description: 'Withdrawal confirmed - funds held - pending admin review' })
  async confirmWithdrawal(
    @Param('id') id: string,
    @Body() dto: ConfirmWithdrawalDto,
    @CurrentUser() user: any,
  ) {
    return this.withdrawalService.confirmWithdrawal({
      withdrawalId: id,
      userId: user.id,
      otpCode: dto.otpCode,
    });
  }

  @Post('withdrawals/:id/resend-otp')
  @ApiOperation({ summary: 'Resend OTP for withdrawal' })
  @ApiResponse({ status: 200, description: 'OTP resent' })
  async resendOTP(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.withdrawalService.resendOTP(id, user.id);
  }

  @Delete('withdrawals/:id')
  @ApiOperation({ summary: 'Cancel withdrawal (only DRAFT status)' })
  @ApiResponse({ status: 200, description: 'Withdrawal cancelled' })
  async cancelWithdrawal(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.withdrawalService.cancelWithdrawal(id, user.id);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get my withdrawals' })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Withdrawals retrieved' })
  async getMyWithdrawals(
    @CurrentUser() user: any,
    @Query('status') status?: WithdrawalStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.withdrawalService.getUserWithdrawals(user.id, {
      status,
      limit,
      offset: (page - 1) * limit,
    });
  }

  @Get('withdrawals/:id')
  @ApiOperation({ summary: 'Get withdrawal by ID' })
  @ApiResponse({ status: 200, description: 'Withdrawal retrieved' })
  async getWithdrawal(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const withdrawal = await this.withdrawalService.getWithdrawal(id);
    
    // Verify user owns this withdrawal
    if (withdrawal.userId !== user.id) {
      throw new Error('Not authorized to view this withdrawal');
    }
    
    return withdrawal;
  }
}
