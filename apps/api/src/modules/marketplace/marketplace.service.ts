import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { MarketplaceType, MarketplaceStatus } from '@omnichannel/database';
import { MarketplaceConnectorFactory } from './marketplace-connector.factory';
import { decryptToken, encryptToken } from './token-crypto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
    private readonly connectorFactory: MarketplaceConnectorFactory,
  ) {}

  async findAll() {
    return this.db.marketplace.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, type: true, shopId: true, shopName: true,
        status: true, syncStatus: true, lastSyncAt: true, webhookStatus: true,
        tokenExpiresAt: true, isActive: true, createdAt: true,
        _count: { select: { orders: true, products: true } },
      },
    });
  }

  async findOne(id: string) {
    const mp = await this.db.marketplace.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { orders: true, products: true } },
        syncLogs: { orderBy: { startedAt: 'desc' }, take: 10 },
      },
    });
    if (!mp) throw new NotFoundException('Marketplace not found');
    // Remove sensitive tokens from response
    const { accessToken: _, refreshToken: __, ...safe } = mp;
    return safe;
  }

  async create(dto: { name: string; type: string }, createdBy: string) {
    return this.db.marketplace.create({
      data: {
        name: dto.name,
        type: dto.type as MarketplaceType,
        status: MarketplaceStatus.DISCONNECTED,
        createdBy,
      },
    });
  }

  async getShopeeAuthUrl(id: string): Promise<{ url: string }> {
    const mp = await this.db.marketplace.findFirst({ where: { id, deletedAt: null } });
    if (!mp) throw new NotFoundException('Marketplace not found');

    const connector = this.connectorFactory.create(mp);

    const redirectUrl = `${this.config.get('app.url')}/api/v1/marketplaces/${id}/connect/shopee/callback`;
    const url = connector.getAuthUrl(redirectUrl);

    return { url };
  }

  async connectShopee(id: string, code: string, shopId: string) {
    const mp = await this.db.marketplace.findFirst({ where: { id, deletedAt: null } });
    if (!mp) throw new NotFoundException('Marketplace not found');

    const partnerId = this.config.get<number>('SHOPEE_PARTNER_ID');
    const partnerKey = this.config.get<string>('SHOPEE_PARTNER_KEY');
    if (!partnerId || !partnerKey) {
      throw new BadRequestException('Shopee credentials not configured');
    }

    try {
      const connector = this.connectorFactory.create({ ...mp, shopId });
      const tokens = await connector.exchangeToken(code, shopId);

      await this.db.marketplace.update({
        where: { id },
        data: {
          shopId: tokens.shopId,
          shopName: mp.shopName || `${mp.name} (${tokens.shopId})`,
          accessToken: encryptToken(tokens.accessToken, this.tokenSecret),
          refreshToken: encryptToken(tokens.refreshToken, this.tokenSecret),
          tokenExpiresAt: tokens.expiresAt,
          tokenRefreshedAt: new Date(),
          status: MarketplaceStatus.CONNECTED,
          isActive: true,
        },
      });

      // Trigger initial sync
      await this.queueService.addSyncProductJob(id, 'full');
      await this.queueService.addSyncOrderJob(id);

      this.logger.log(`Shopee marketplace ${id} connected successfully`);
      return { success: true, message: 'Marketplace connected successfully' };
    } catch (error) {
      this.logger.error(`Failed to connect Shopee marketplace ${id}:`, error);
      await this.db.marketplace.update({
        where: { id },
        data: { status: MarketplaceStatus.ERROR },
      });
      throw new BadRequestException('Failed to connect marketplace');
    }
  }

  getMarketplaceRedirectUrl(status: 'connected' | 'failed') {
    return `${this.config.get('app.frontendUrl')}/marketplace?status=${status}`;
  }

  async disconnect(id: string) {
    const mp = await this.db.marketplace.findFirst({ where: { id, deletedAt: null } });
    if (!mp) throw new NotFoundException('Marketplace not found');

    await this.db.marketplace.update({
      where: { id },
      data: {
        status: MarketplaceStatus.DISCONNECTED,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        isActive: false,
      },
    });

    return { success: true, message: 'Marketplace disconnected' };
  }

  async triggerSync(id: string) {
    const mp = await this.db.marketplace.findFirst({ where: { id, deletedAt: null } });
    if (!mp) throw new NotFoundException('Marketplace not found');
    if (mp.status !== 'CONNECTED') throw new BadRequestException('Marketplace is not connected');

    await Promise.all([
      this.queueService.addSyncProductJob(id, 'incremental'),
      this.queueService.addSyncStockJob(id),
      this.queueService.addSyncOrderJob(id),
    ]);

    return { success: true, message: 'Sync queued successfully' };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens() {
    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const marketplaces = await this.db.marketplace.findMany({
      where: {
        deletedAt: null,
        status: MarketplaceStatus.CONNECTED,
        refreshToken: { not: null },
        tokenExpiresAt: { lte: threshold },
      },
    });

    for (const marketplace of marketplaces) {
      try {
        const connector = this.connectorFactory.create(marketplace);
        const refreshToken = decryptToken(marketplace.refreshToken, this.tokenSecret);
        if (!refreshToken) throw new Error('Refresh token missing');
        const tokens = await connector.refreshAccessToken(refreshToken);
        await this.db.marketplace.update({
          where: { id: marketplace.id },
          data: {
            accessToken: encryptToken(tokens.accessToken, this.tokenSecret),
            refreshToken: encryptToken(tokens.refreshToken, this.tokenSecret),
            tokenExpiresAt: tokens.expiresAt,
            tokenRefreshedAt: new Date(),
            status: MarketplaceStatus.CONNECTED,
            lastSyncError: null,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to refresh token for marketplace ${marketplace.id}`, error);
        await this.db.marketplace.update({
          where: { id: marketplace.id },
          data: {
            status: MarketplaceStatus.TOKEN_EXPIRED,
            lastSyncError: error instanceof Error ? error.message : 'Token refresh failed',
          },
        });
      }
    }
  }

  async remove(id: string) {
    const mp = await this.db.marketplace.findFirst({ where: { id, deletedAt: null } });
    if (!mp) throw new NotFoundException('Marketplace not found');
    await this.db.marketplace.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private get tokenSecret() {
    return this.config.get<string>('MARKETPLACE_TOKEN_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET');
  }
}
