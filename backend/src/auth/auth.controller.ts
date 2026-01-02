import { Controller, Post, Body, Get, UseGuards, Req, Res, Query, HttpException } from '@nestjs/common';
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
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                affiliateCode: { type: 'string' },
                referredBy: { type: 'string' },
                role: { type: 'string' },
                isActive: { type: 'boolean' },
                premium: { type: 'boolean' },
                wallet: {
                  type: 'object',
                  properties: {
                    available: { type: 'number' },
                    held: { type: 'number' },
                    totalDeposited: { type: 'number' },
                  }
                }
              }
            },
            token: { type: 'string' }
          }
        },
        message: { type: 'string' },
        statusCode: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data - either email or phone required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        data: result,
        message: 'Success',
        statusCode: 201,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log the error for debugging
      console.error('Registration controller error:', error);
      
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      
      // For other errors, throw a generic 500 error
      throw new HttpException(
        {
          statusCode: 500,
          timestamp: new Date().toISOString(),
          path: '/auth/register',
          method: 'POST',
          message: error.message || 'Internal server error'
        },
        500
      );
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user with email OR phone number' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
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
                    totalDeposited: { type: 'number' },
                  }
                }
              }
            },
            token: { type: 'string' }
          }
        },
        message: { type: 'string' },
        statusCode: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Either email or phone required' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return {
        data: result,
        message: 'Success',
        statusCode: 200,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Login controller error:', error);
      throw error;
    }
  }

  @Get('referrer-info')
  @ApiOperation({ summary: 'Get information about referrer by affiliate code' })
  @ApiResponse({ 
    status: 200, 
    description: 'Referrer info retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
          }
        },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Referrer not found' })
  @ApiResponse({ status: 400, description: 'Referral code is required' })
  async getReferrerInfo(@Query('code') code: string) {
    try {
      const referrer = await this.authService.getReferrerInfo(code);
      return {
        success: true,
        data: referrer,
        message: 'Success'
      };
    } catch (error) {
      console.error('Error in getReferrerInfo:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error fetching referrer info'
      };
    }
  }

  @Post('demo')
  @ApiOperation({ summary: 'Create and login as a demo user (for testing purposes)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Demo account created and logged in successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
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
                    held: { type: 'number' },
                    totalDeposited: { type: 'number' },
                  }
                }
              }
            },
            token: { type: 'string' },
            demoMessage: { type: 'string' }
          }
        },
        message: { type: 'string' },
        statusCode: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Failed to create demo account' })
  async createDemo() {
    try {
      const result = await this.authService.createDemoAccount();
      return {
        data: result,
        message: 'Success',
        statusCode: 201,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Demo account creation error:', error);
      throw error;
    }
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
            totalDeposited: { type: 'number' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfile(@Body() body: any) {
    return body;
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                username: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                affiliateCode: { type: 'string' },
                role: { type: 'string' },
                isActive: { type: 'boolean' },
                premium: { type: 'boolean' },
                wallet: {
                  type: 'object',
                  properties: {
                    available: { type: 'number' },
                    held: { type: 'number' },
                    totalDeposited: { type: 'number' },
                  }
                }
              }
            }
          }
        },
        message: { type: 'string' },
        statusCode: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@CurrentUser() user: any) {
    console.log('GET /auth/me - User data:', JSON.stringify(user, null, 2));
    if (!user) {
      console.error('GET /auth/me - User is null/undefined');
    } else if (!user.id) {
      console.error('GET /auth/me - User missing id field:', Object.keys(user));
    }
    return { 
      data: { user },
      message: 'Success',
      statusCode: 200,
      timestamp: new Date().toISOString()
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint to check server functionality' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { 
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        message: { type: 'string' },
        statusCode: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  test() {
    return { 
      data: { message: 'Auth service is working!' },
      message: 'Success',
      statusCode: 200,
      timestamp: new Date().toISOString()
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset with OTP sent to email OR phone' })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            email: { type: 'string' }
          }
        },
        message: { type: 'string' },
        statusCode: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input - either email or phone required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      const result = await this.authService.forgotPassword(forgotPasswordDto);
      return {
        data: result,
        message: 'Success',
        statusCode: 200,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP received via email OR phone' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
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
        },
        message: { type: 'string' },
        statusCode: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or input data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      const result = await this.authService.resetPassword(resetPasswordDto);
      return {
        data: result,
        message: 'Success',
        statusCode: 200,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }
}