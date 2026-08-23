import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.create(WorkerModule, { logger: ['error', 'warn', 'log'] });

  app.enableShutdownHooks();
  await app.init();

  logger.log('🔄 Worker process started — listening for BullMQ jobs');
}

bootstrap().catch((err) => {
  new Logger('Worker').error('Worker failed to start', err);
  process.exit(1);
});
