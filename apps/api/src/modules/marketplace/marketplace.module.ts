import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceOAuthController } from './marketplace-oauth.controller';
import { MarketplaceConnectorFactory } from './marketplace-connector.factory';
import { MarketplaceService } from './marketplace.service';

@Module({
  controllers: [MarketplaceController, MarketplaceOAuthController],
  providers: [MarketplaceService, MarketplaceConnectorFactory],
  exports: [MarketplaceService, MarketplaceConnectorFactory],
})
export class MarketplaceModule {}
