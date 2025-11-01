import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import express, { Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

let cachedApp: express.Express | null = null;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  const app = await NestFactory.create(AppModule, adapter, {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
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
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Swagger configuration
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
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
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: -1,
        docExpansion: 'none',
      },
    });
  }

  await app.init();
  cachedApp = expressApp;
  
  return expressApp;
}

export default async (req: Request, res: Response): Promise<void> => {
  const app = await createApp();
  app(req, res);
};

