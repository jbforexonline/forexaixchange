import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from './decorators/user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email OR phone number' })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            premium: { type: 'boolean' },
            wallet: {
              type: 'object',
              properties: {
                available: { type: 'number' },
                held: { type: 'number' },
              }
            }
          }
        },
        token: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data - either email or phone required' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user with email OR phone number' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            premium: { type: 'boolean' },
            wallet: {
              type: 'object',
              properties: {
                available: { type: 'number' },
                held: { type: 'number' },
              }
            }
          }
        },
        token: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Either email or phone required' })
  // async login(@Body() loginDto: LoginDto) {
  //   return this.authService.login(loginDto);
  // }

  @Post('demo')
  @ApiOperation({ summary: 'Create and login as a demo user (for testing purposes)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Demo account created and logged in successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' },
            wallet: {
              type: 'object',
              properties: {
                available: { type: 'number' },
              }
            }
          }
        },
        token: { type: 'string' },
        demoMessage: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Failed to create demo account' })
  async createDemo() {
    return this.authService.createDemoAccount();
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
        premium: { type: 'boolean' },
        wallet: {
          type: 'object',
          properties: {
            available: { type: 'number' },
            held: { type: 'number' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfile(@Body() body: any) {
    // NO AUTH - just return any request body
    return body;
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@CurrentUser() user: any) {
    console.log('GET /auth/me - User data:', JSON.stringify(user, null, 2));
    if (!user) {
      console.error('GET /auth/me - User is null/undefined');
    } else if (!user.id) {
      console.error('GET /auth/me - User missing id field:', Object.keys(user));
    }
    return { user };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint to check server functionality' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  test() {
    return { message: 'Auth service is working!', timestamp: new Date().toISOString() };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset with OTP sent to email OR phone' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        identifier: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input - either email or phone required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP received via email OR phone' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            username: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or input data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

}
