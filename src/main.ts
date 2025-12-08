import * as process from 'node:process';

import { NestFactory } from '@nestjs/core';
import * as express from 'express';

import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/http/global-http-exception.filter';
import { AppLogger } from './common/services/logger/app-logger';
import { setupSwagger } from './common/utils/swagger-setup';

async function bootstrap() {
  const appLogger = new AppLogger();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: false,
    logger: appLogger,
  });

  app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
  app.enableCors();
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  app.useLogger(appLogger);
  app.flushLogs();

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  await app.listen(process.env.API_PORT ?? 3000);
}
void bootstrap();
