import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { MarketplaceSyncService } from '../services/marketplace-sync.service';

export interface SyncStockJobData {
  marketplaceId: string;
  productIds?: string[];
}

@Processor(QUEUE_NAMES.SYNC_STOCK)
export class SyncStockProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncStockProcessor.name);

  constructor(private readonly syncService: MarketplaceSyncService) {
    super();
  }

  async process(job: Job<SyncStockJobData>): Promise<void> {
    this.logger.log(`Processing sync-stock job [${job.id}]`);
    await this.syncService.syncStock(job.data.marketplaceId, job.data.productIds);
    await job.updateProgress(100);
    this.logger.log(`Sync stock job [${job.id}] completed`);
  }
}
