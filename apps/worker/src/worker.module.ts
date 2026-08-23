import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { SyncProductProcessor } from './processors/sync-product.processor';
import { SyncStockProcessor } from './processors/sync-stock.processor';
import { SyncOrderProcessor } from './processors/sync-order.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { MarketplaceConnectorFactory } from './services/marketplace-connector.factory';
import { MarketplaceSyncService } from './services/marketplace-sync.service';
import { WorkerDatabaseService } from './services/worker-database.service';

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
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SYNC_PRODUCT },
      { name: QUEUE_NAMES.SYNC_STOCK },
      { name: QUEUE_NAMES.SYNC_ORDER },
      { name: QUEUE_NAMES.WEBHOOK },
      { name: QUEUE_NAMES.NOTIFICATION },
    ),
  ],
  providers: [
    SyncProductProcessor,
    SyncStockProcessor,
    SyncOrderProcessor,
    WebhookProcessor,
    NotificationProcessor,
    WorkerDatabaseService,
    MarketplaceConnectorFactory,
    MarketplaceSyncService,
  ],
})
export class WorkerModule {}
