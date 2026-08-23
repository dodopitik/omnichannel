import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { ShopeeWebhookController } from './handlers/shopee-webhook.controller';
import { WebhookDatabaseService } from './services/webhook-database.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.WEBHOOK }),
  ],
  controllers: [ShopeeWebhookController],
  providers: [WebhookDatabaseService],
})
export class WebhookModule {}
