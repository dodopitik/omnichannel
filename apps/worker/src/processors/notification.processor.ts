import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@omnichannel/shared';

export interface NotificationJobData {
  userId?: string;
  type: string;
  title: string;
  message: string;
  channel: 'IN_APP' | 'EMAIL' | 'WEBHOOK';
  data?: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, type, title, channel } = job.data;
    this.logger.log(
      `Processing notification job [${job.id}]: user=${userId} type=${type} channel=${channel}`,
    );
    // Placeholder — full implementation in Sprint 5
    this.logger.log(`📣 Notification "${title}" queued for ${channel}`);
    await job.updateProgress(100);
  }
}
