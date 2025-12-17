// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://routejob.vercel.app',
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(3001);
}
bootstrap();
