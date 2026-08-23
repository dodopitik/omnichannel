import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ProductsService } from './products.service';

export class ProductQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;
}

export class ProductVariantInputDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  options?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  sellingPrice?: number;
}

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  costPrice?: number;
}

export class MarketplaceMappingDto {
  @IsString()
  marketplaceId: string;

  @IsString()
  marketplaceItemId: string;

  @IsOptional()
  @IsString()
  marketplaceModelId?: string;

  @IsOptional()
  @IsString()
  marketplaceSku?: string;
}

@ApiTags('Products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Get products with stock and marketplace summary' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Get product statistics' })
  getStats() {
    return this.productsService.getStats();
  }

  @Get(':id')
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Get product detail' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @RequirePermissions('products:create')
  @ApiOperation({ summary: 'Create product with optional variants and initial stock' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('products:update')
  @ApiOperation({ summary: 'Update product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Post(':id/variants')
  @RequirePermissions('products:update')
  @ApiOperation({ summary: 'Create product variant' })
  createVariant(@Param('id') id: string, @Body() dto: ProductVariantInputDto) {
    return this.productsService.createVariant(id, dto);
  }

  @Post(':id/marketplace-mappings')
  @RequirePermissions('products:update')
  @ApiOperation({ summary: 'Create or update marketplace SKU mapping' })
  upsertMarketplaceMapping(@Param('id') id: string, @Body() dto: MarketplaceMappingDto) {
    return this.productsService.upsertMarketplaceMapping(id, dto);
  }
}
