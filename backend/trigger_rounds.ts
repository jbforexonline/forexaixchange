
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { RoundsSchedulerService } from './src/rounds/rounds-scheduler.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const scheduler = app.get(RoundsSchedulerService);
  
  console.log('Manually triggering round transition...');
  await scheduler.manualTrigger();
  console.log('Trigger complete.');
  
  await app.close();
}

bootstrap();
