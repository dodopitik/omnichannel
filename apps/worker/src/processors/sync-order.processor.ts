import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { MarketplaceSyncService } from '../services/marketplace-sync.service';

export interface SyncOrderJobData {
  marketplaceId: string;
  startTime?: number;
  orderSn?: string;
}

@Processor(QUEUE_NAMES.SYNC_ORDER)
export class SyncOrderProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncOrderProcessor.name);

  constructor(private readonly syncService: MarketplaceSyncService) {
    super();
  }

  async process(job: Job<SyncOrderJobData>): Promise<void> {
    this.logger.log(`Processing sync-order job [${job.id}]`);
    await this.syncService.syncOrders(job.data.marketplaceId, {
      startTime: job.data.startTime,
      orderSn: job.data.orderSn,
    });
    await job.updateProgress(100);
    this.logger.log(`Sync order job [${job.id}] completed`);
  }
}
