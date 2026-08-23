import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Marketplace } from '@omnichannel/database';
import { ShopeeConnector } from '@omnichannel/shopee';
import { decryptToken } from './token-crypto';

@Injectable()
export class MarketplaceConnectorFactory {
  constructor(private readonly config: ConfigService) {}

  create(marketplace: Pick<Marketplace, 'type' | 'shopId' | 'accessToken'>) {
    switch (marketplace.type) {
      case 'SHOPEE': {
        const shopeeConfig = this.config.get('shopee');
        
        if (!shopeeConfig.partnerId || !shopeeConfig.partnerKey) {
          throw new BadRequestException('Shopee credentials not configured. Please set SHOPEE_PARTNER_ID and SHOPEE_PARTNER_KEY in .env');
        }

        const tokenSecret = this.config.get<string>('JWT_SECRET');
        
        return new ShopeeConnector({
          partnerId: shopeeConfig.partnerId,
          partnerKey: shopeeConfig.partnerKey,
          baseUrl: shopeeConfig.baseUrl,
          shopId: marketplace.shopId ? Number(marketplace.shopId) : undefined,
          accessToken: marketplace.accessToken ? decryptToken(marketplace.accessToken, tokenSecret) : undefined,
        });
      }
      default:
        throw new BadRequestException(Marketplace connector not implemented: );
    }
  }
}
