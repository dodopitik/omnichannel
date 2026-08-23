import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

export class CreateMarketplaceDto {
  @ApiProperty({ example: 'Toko Saya' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['SHOPEE', 'TOKOPEDIA', 'TIKTOK_SHOP', 'LAZADA', 'SHOPIFY', 'WOOCOMMERCE'] })
  @IsEnum(['SHOPEE', 'TOKOPEDIA', 'TIKTOK_SHOP', 'LAZADA', 'SHOPIFY', 'WOOCOMMERCE'])
  type: string;
}

export class ConnectShopeeDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  shopId: string;
}

@ApiTags('Marketplace')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'marketplaces', version: '1' })
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  @RequirePermissions('marketplace:read')
  @ApiOperation({ summary: 'Get all marketplaces' })
  findAll() { return this.marketplaceService.findAll(); }

  @Get(':id')
  @RequirePermissions('marketplace:read')
  @ApiOperation({ summary: 'Get marketplace by ID' })
  findOne(@Param('id') id: string) { return this.marketplaceService.findOne(id); }

  @Post()
  @RequirePermissions('marketplace:connect')
  @ApiOperation({ summary: 'Create marketplace connection' })
  create(@Body() dto: CreateMarketplaceDto, @CurrentUser() user: JwtPayload) {
    return this.marketplaceService.create(dto, user.sub);
  }

  @Post(':id/connect/shopee')
  @RequirePermissions('marketplace:connect')
  @ApiOperation({ summary: 'Connect Shopee OAuth (exchange code for token)' })
  connectShopee(@Param('id') id: string, @Body() dto: ConnectShopeeDto) {
    return this.marketplaceService.connectShopee(id, dto.code, dto.shopId);
  }

  @Get(':id/auth-url/shopee')
  @RequirePermissions('marketplace:connect')
  @ApiOperation({ summary: 'Get Shopee OAuth URL' })
  getShopeeAuthUrl(@Param('id') id: string) {
    return this.marketplaceService.getShopeeAuthUrl(id);
  }

  @Post(':id/disconnect')
  @RequirePermissions('marketplace:disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect marketplace' })
  disconnect(@Param('id') id: string) { return this.marketplaceService.disconnect(id); }

  @Post(':id/sync')
  @RequirePermissions('marketplace:sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger marketplace sync' })
  sync(@Param('id') id: string) { return this.marketplaceService.triggerSync(id); }

  @Delete(':id')
  @RequirePermissions('marketplace:disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete marketplace' })
  remove(@Param('id') id: string) { return this.marketplaceService.remove(id); }
}
