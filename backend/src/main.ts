import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

    // CORS configuration (supports multiple URLs in FRONTEND_URL, comma-separated)
    const frontendEnv = process.env.FRONTEND_URL || '';
    const allowedOrigins = [
      ...frontendEnv.split(',').map(s => s.trim()).filter(Boolean),
      'http://localhost:3000',
      'http://localhost:3001',
    ];
  
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (Postman, server-to-server)
        if (!origin) return callback(null, true);
  
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`), false);
      },
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true, // OK to keep true
      // IMPORTANT: remove allowedHeaders so it auto-allows what the browser requests
      // (hardcoding can break preflight if a new header appears)
    });
  

  // Swagger configuration
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

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
