import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

let cachedApp: express.Express | null = null;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  try {
    console.log('🚀 Initializing NestJS application...');
    
    // Dynamic imports to handle path resolution issues
    const { AppModule } = await import('../src/app.module.js');
    const { AllExceptionsFilter } = await import('../src/common/filters/all-exceptions.filter.js');
    const { TransformInterceptor } = await import('../src/common/interceptors/transform.interceptor.js');

    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);
    
    const app = await NestFactory.create(AppModule, adapter, {
      logger: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn', 'log'] 
        : ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // Global response interceptor
    app.useGlobalInterceptors(new TransformInterceptor());

    // CORS configuration
    const frontendUrl = process.env.FRONTEND_URL;
    const allowedOrigins = frontendUrl
      ? [frontendUrl, 'http://localhost:3000', 'http://localhost:3001']
      : ['http://localhost:3000', 'http://localhost:3001', '*'];
    
    app.enableCors({
      origin: true, // Allow all origins in serverless environment
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

    // Swagger configuration - always enable in serverless
    const config = new DocumentBuilder()
      .setTitle('ForexAI Exchange API')
      .setDescription('Backend API for ForexAI Exchange - A trading platform with spin-based games')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token (without Bearer prefix)',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Wallet', 'Wallet and transaction management')
      .addTag('Spins', 'Spin-based trading game endpoints')
      .addTag('Premium', 'Premium subscription management')
      .addTag('Affiliate', 'Affiliate program management')
      .addTag('Admin', 'Administrative endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'ForexAI Exchange API',
      customfavIcon: 'https://static-00.iconduck.com/assets.00/swagger-icon-512x512.png',
      customCssUrl: 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css',
      customJs: [
        'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js',
        'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js',
      ],
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: -1,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });

    await app.init();
    cachedApp = expressApp;
    
    console.log('✅ NestJS application initialized successfully');
    return expressApp;
  } catch (error) {
    console.error('❌ Error initializing NestJS application:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export default async (req: Request, res: Response): Promise<void> => {
  try {
    const app = await createApp();
    return app(req, res);
  } catch (error) {
    console.error('❌ Function invocation error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : (error instanceof Error ? error.message : 'Unknown error'),
    });
  }
};

