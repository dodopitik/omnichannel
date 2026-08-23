import { Body, Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Request } from 'express';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { QUEUE_NAMES } from '@omnichannel/shared';
import { WebhookEventType } from '@omnichannel/database';
import { WebhookDatabaseService } from '../services/webhook-database.service';

interface ShopeeWebhookPayload {
  code: number;
  timestamp: number;
  shop_id: number;
  data?: Record<string, unknown>;
}

@Controller('shopee')
export class ShopeeWebhookController {
  private readonly logger = new Logger(ShopeeWebhookController.name);

  constructor(
    private readonly db: WebhookDatabaseService,
    @InjectQueue(QUEUE_NAMES.WEBHOOK) private readonly webhookQueue: Queue,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: ShopeeWebhookPayload,
    @Headers('authorization') signature: string,
    @Req() req: Request,
  ) {
    this.logger.log(`Shopee webhook received: code=${payload.code} shop=${payload.shop_id}`);

    if (!this.verifySignature(req, signature)) {
      this.logger.warn('Shopee webhook signature verification failed');
      return { status: 'ignored', reason: 'invalid_signature' };
    }

    const marketplace = await this.db.marketplace.findFirst({
      where: { type: 'SHOPEE', shopId: String(payload.shop_id), deletedAt: null },
    });

    if (!marketplace) {
      this.logger.warn(`Shopee webhook ignored because shop is not connected: ${payload.shop_id}`);
      return { status: 'ignored', reason: 'marketplace_not_found' };
    }

    const webhookLog = await this.db.webhookLog.create({
      data: {
        marketplaceId: marketplace.id,
        eventType: this.mapEventType(payload.code),
        payload: payload as any,
        headers: req.headers as any,
        signature,
        isVerified: true,
      },
    });

    await this.webhookQueue.add(
      'process',
      {
        marketplaceId: marketplace.id,
        marketplaceType: 'SHOPEE',
        webhookLogId: webhookLog.id,
        eventCode: payload.code,
        payload,
      },
      { jobId: `shopee-webhook-${webhookLog.id}`, priority: 1 },
    );

    return { status: 'ok' };
  }

  private verifySignature(req: Request, signature?: string): boolean {
    const partnerKey = process.env.SHOPEE_PARTNER_KEY;
    if (!partnerKey) return true;
    if (!signature) return false;

    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) return false;

      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const baseStr = `${url}|${rawBody.toString()}`;
      const expectedSig = crypto.createHmac('sha256', partnerKey).update(baseStr).digest('hex');
      return signature === expectedSig;
    } catch {
      return false;
    }
  }

  private mapEventType(code: number): WebhookEventType {
    switch (code) {
      case 15:
        return WebhookEventType.ORDER_CREATED;
      case 3:
        return WebhookEventType.ORDER_UPDATED;
      case 4:
        return WebhookEventType.SHIPMENT_UPDATED;
      default:
        return WebhookEventType.ORDER_UPDATED;
    }
  }
}
