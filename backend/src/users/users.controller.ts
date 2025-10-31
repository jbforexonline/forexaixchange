import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(page, limit, search);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto, null);
  }

  @Post(':id/ban')
  @ApiOperation({ summary: 'Ban user' })
  @ApiResponse({ status: 200, description: 'User banned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async banUser(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.usersService.banUser(id, reason);
  }

  @Post(':id/unban')
  @ApiOperation({ summary: 'Unban user' })
  @ApiResponse({ status: 200, description: 'User unbanned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unbanUser(@Param('id') id: string) {
    return this.usersService.unbanUser(id);
  }

  @Post(':id/kyc/approve')
  @ApiOperation({ summary: 'Approve user KYC' })
  @ApiResponse({ status: 200, description: 'KYC approved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async approveKyc(@Param('id') id: string) {
    return this.usersService.approveKyc(id);
  }

  @Post(':id/kyc/reject')
  @ApiOperation({ summary: 'Reject user KYC' })
  @ApiResponse({ status: 200, description: 'KYC rejected successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async rejectKyc(@Param('id') id: string) {
    return this.usersService.rejectKyc(id);
  }
}
