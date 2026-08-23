import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { MarketplaceSyncService } from '../services/marketplace-sync.service';

export interface SyncProductJobData {
  marketplaceId: string;
  productId?: string;
  type: 'full' | 'incremental' | 'single';
}

@Processor(QUEUE_NAMES.SYNC_PRODUCT)
export class SyncProductProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProductProcessor.name);

  constructor(private readonly syncService: MarketplaceSyncService) {
    super();
  }

  async process(job: Job<SyncProductJobData>): Promise<void> {
    const { marketplaceId, productId, type } = job.data;
    this.logger.log(`Processing sync-product job [${job.id}]: marketplace=${marketplaceId} type=${type}`);

    try {
      await job.updateProgress(0);
      if (type === 'single' && productId) {
        this.logger.warn('Single product sync is not implemented yet, running marketplace sync');
      }
      await this.syncService.syncProducts(marketplaceId);
      await job.updateProgress(100);
      this.logger.log(`Sync product job [${job.id}] completed`);
    } catch (error) {
      this.logger.error(`Sync product job [${job.id}] failed:`, error);
      throw error;
    }
  }
}
