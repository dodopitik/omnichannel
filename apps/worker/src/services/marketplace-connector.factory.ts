import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Marketplace } from '@omnichannel/database';
import { ShopeeConnector } from '@omnichannel/shopee';
import { decryptToken } from './token-crypto';

@Injectable()
export class MarketplaceConnectorFactory {
  constructor(private readonly config: ConfigService) {}

  create(marketplace: Pick<Marketplace, 'type' | 'shopId' | 'accessToken'>) {
    switch (marketplace.type) {
      case 'SHOPEE':
        return new ShopeeConnector({
          partnerId: Number(this.config.get('SHOPEE_PARTNER_ID')),
          partnerKey: this.config.get<string>('SHOPEE_PARTNER_KEY') || '',
          baseUrl: this.config.get<string>('SHOPEE_BASE_URL'),
          shopId: marketplace.shopId ? Number(marketplace.shopId) : undefined,
          accessToken: decryptToken(marketplace.accessToken, this.config.get<string>('MARKETPLACE_TOKEN_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET')),
        });
      default:
        throw new Error(`Marketplace connector not implemented: ${marketplace.type}`);
    }
  }
}
