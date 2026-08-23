import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get('redis.password'),
          db: configService.get<number>('redis.db', 0),
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
      { name: QUEUE_NAMES.REFRESH_TOKEN },
      { name: QUEUE_NAMES.WEBHOOK },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.EMAIL },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
