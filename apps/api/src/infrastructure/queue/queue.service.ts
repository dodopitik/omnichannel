import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SYNC_PRODUCT) private readonly syncProductQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SYNC_STOCK) private readonly syncStockQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SYNC_ORDER) private readonly syncOrderQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK) private readonly webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async addSyncProductJob(
    marketplaceId: string,
    type: 'full' | 'incremental' | 'single' = 'incremental',
    productId?: string,
  ) {
    return this.syncProductQueue.add(
      'sync',
      { marketplaceId, type, productId },
      { jobId: `sync-product-${marketplaceId}-${Date.now()}` },
    );
  }

  async addSyncStockJob(marketplaceId: string, productIds?: string[]) {
    return this.syncStockQueue.add(
      'sync',
      { marketplaceId, productIds },
      { jobId: `sync-stock-${marketplaceId}-${Date.now()}` },
    );
  }

  async addSyncOrderJob(marketplaceId: string, startTime?: number) {
    return this.syncOrderQueue.add(
      'sync',
      { marketplaceId, startTime },
      { jobId: `sync-order-${marketplaceId}-${Date.now()}` },
    );
  }

  async addWebhookJob(data: {
    marketplaceId: string;
    marketplaceType: string;
    webhookLogId?: string;
    eventCode?: number;
    payload: Record<string, unknown>;
  }) {
    return this.webhookQueue.add('process', data, {
      jobId: `webhook-${data.marketplaceType}-${data.webhookLogId || Date.now()}`,
      priority: 1,
    });
  }

  async addNotificationJob(data: {
    userId?: string;
    type: string;
    title: string;
    message: string;
    channel: string;
  }) {
    return this.notificationQueue.add('send', data, {
      priority: data.type === 'ERROR' ? 1 : 3,
    });
  }

  async addEmailJob(data: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }) {
    return this.emailQueue.add('send', data);
  }

  async getQueueStats() {
    const queues = [
      { name: QUEUE_NAMES.SYNC_PRODUCT, queue: this.syncProductQueue },
      { name: QUEUE_NAMES.SYNC_STOCK, queue: this.syncStockQueue },
      { name: QUEUE_NAMES.SYNC_ORDER, queue: this.syncOrderQueue },
      { name: QUEUE_NAMES.WEBHOOK, queue: this.webhookQueue },
      { name: QUEUE_NAMES.NOTIFICATION, queue: this.notificationQueue },
    ];

    const stats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);
        return { name, waiting, active, completed, failed };
      }),
    );

    return stats;
  }

  getQueue(name: string) {
    const queues: Record<string, Queue> = {
      [QUEUE_NAMES.SYNC_PRODUCT]: this.syncProductQueue,
      [QUEUE_NAMES.SYNC_STOCK]: this.syncStockQueue,
      [QUEUE_NAMES.SYNC_ORDER]: this.syncOrderQueue,
      [QUEUE_NAMES.WEBHOOK]: this.webhookQueue,
      [QUEUE_NAMES.NOTIFICATION]: this.notificationQueue,
      [QUEUE_NAMES.EMAIL]: this.emailQueue,
    };
    return queues[name];
  }

  async getFailedJobs(name: string) {
    const queue = this.getQueue(name);
    if (!queue) return [];
    const jobs = await queue.getFailed(0, 50);
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }));
  }

  async retryJob(name: string, jobId: string) {
    const queue = this.getQueue(name);
    if (!queue) return { retried: false };
    const job = await queue.getJob(jobId);
    if (!job) return { retried: false };
    await job.retry();
    return { retried: true };
  }
}
