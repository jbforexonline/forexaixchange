import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('Admin')
@Controller('sysadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN')
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {
    console.log('✅ AdminController Initialized at /sysadmin');
  }

  @Get('ping')
  @ApiOperation({ summary: 'Verify Admin API status' })
  async ping() {
    return { success: true, message: 'Admin API Active' };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  async getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(parseInt(page), parseInt(limit), search);
  }

  @Post('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateUser(id, data);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all platform transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getAllTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllTransactions(parseInt(page), parseInt(limit), type, status);
  }

  @Get('spins')
  @ApiOperation({ summary: 'Get all platform spins' })
  @ApiResponse({ status: 200, description: 'Spins retrieved successfully' })
  async getAllSpins(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('isDemo') isDemo?: string,
  ) {
    const demo = isDemo === 'true' ? true : isDemo === 'false' ? false : undefined;
    return this.adminService.getAllSpins(parseInt(page), parseInt(limit), demo);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get all system configurations' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved' })
  async getConfig() {
    return this.adminService.getSystemConfig();
  }

  @Post('config/:key')
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('key') key: string,
    @Body('value') value: string,
    @CurrentUser() user: any
  ) {
    return this.adminService.updateSystemConfig(key, value, user.id);
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Set maintenance mode' })
  @ApiResponse({ status: 200, description: 'Maintenance mode updated' })
  async setMaintenanceMode(@Body('enabled') enabled: boolean, @CurrentUser() user: any) {
    return this.adminService.updateSystemConfig('maintenance_mode', String(enabled), user.id);
  }

  @Get('affiliate/settings')
  @ApiOperation({ summary: 'Get affiliate program settings' })
  async getAffiliateSettings() {
    const config = await this.adminService.getSystemConfigByKey('affiliate_settings');
    return { settings: config ? JSON.parse(config.value) : null };
  }

  @Post('affiliate/settings')
  @ApiOperation({ summary: 'Update affiliate program settings' })
  async updateAffiliateSettings(@Body() settings: any, @CurrentUser() user: any) {
    return this.adminService.updateSystemConfig('affiliate_settings', JSON.stringify(settings), user.id);
  }
}
