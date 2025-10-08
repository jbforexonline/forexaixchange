import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // allow the Next.js dev server
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}
bootstrap();
