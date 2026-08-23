import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { MarketplaceService } from './marketplace.service';

@ApiExcludeController()
@Controller({ path: 'marketplaces', version: '1' })
export class MarketplaceOAuthController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get(':id/connect/shopee/callback')
  async shopeeCallback(
    @Param('id') id: string,
    @Query('code') code: string,
    @Query('shop_id') shopId: string,
    @Res() response: Response,
  ) {
    try {
      await this.marketplaceService.connectShopee(id, code, shopId);
      return response.redirect(this.marketplaceService.getMarketplaceRedirectUrl('connected'));
    } catch {
      return response.redirect(this.marketplaceService.getMarketplaceRedirectUrl('failed'));
    }
  }
}
