import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { MarketplaceSyncService } from '../services/marketplace-sync.service';
import { WorkerDatabaseService } from '../services/worker-database.service';

export interface WebhookJobData {
  marketplaceId: string;
  marketplaceType: string;
  webhookLogId?: string;
  eventCode?: number;
  payload: Record<string, any>;
}

@Processor(QUEUE_NAMES.WEBHOOK)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly syncService: MarketplaceSyncService,
    private readonly db: WorkerDatabaseService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { marketplaceId, webhookLogId, payload } = job.data;
    this.logger.log(`Processing webhook job [${job.id}] marketplace=${marketplaceId}`);

    const orderSn = this.extractOrderSn(payload);
    await this.syncService.syncOrders(marketplaceId, { orderSn });

    if (webhookLogId) {
      await this.db.webhookLog.update({
        where: { id: webhookLogId },
        data: { isProcessed: true, processedAt: new Date(), error: null },
      });
    }
  }

  private extractOrderSn(payload: Record<string, any>) {
    return payload.data?.ordersn || payload.data?.order_sn || payload.data?.orderSn;
  }
}
