import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WebhookModule } from './webhook.module';

async function bootstrap() {
  const logger = new Logger('Webhook');
  const app = await NestFactory.create(WebhookModule, {
    rawBody: true, // Required for signature verification
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('webhook');
  app.enableShutdownHooks();

  const port = process.env.WEBHOOK_PORT || 3003;
  await app.listen(port, '0.0.0.0');
  logger.log(`🔗 Webhook service running on port ${port}`);
}

bootstrap().catch((err) => {
  new Logger('Webhook').error('Webhook service failed to start', err);
  process.exit(1);
});
