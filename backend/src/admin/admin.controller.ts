import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Get('config')
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ status: 200, description: 'System config retrieved successfully' })
  async getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  @Post('config/:key')
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({ status: 200, description: 'System config updated successfully' })
  async updateSystemConfig(
    @Param('key') key: string,
    @Body('value') value: string,
    @Body() body: any,
  ) {
    const userId = body.userId || 'default-admin';
    return this.adminService.updateSystemConfig(key, value, userId);
  }
}
