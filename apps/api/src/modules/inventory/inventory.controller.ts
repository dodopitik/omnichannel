import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { InventoryService } from './inventory.service';

export class InventoryQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class AdjustStockDto {
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StockTransferItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsNumber()
  quantity: number;
}

export class CreateStockTransferDto {
  @IsString()
  fromWarehouseId: string;

  @IsString()
  toWarehouseId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items: StockTransferItemDto[];
}

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get stock items' })
  findStock(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findStock(query);
  }

  @Get('warehouses')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get warehouses' })
  getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  @Get('stats')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get inventory statistics' })
  getStats() {
    return this.inventoryService.getStats();
  }

  @Post('stock/:id/adjust')
  @RequirePermissions('inventory:adjust')
  @ApiOperation({ summary: 'Adjust stock by delta quantity' })
  adjustStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(id, dto);
  }

  @Post('stock/:id/opname')
  @RequirePermissions('inventory:adjust')
  @ApiOperation({ summary: 'Set stock to counted quantity' })
  opnameStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.opnameStock(id, dto);
  }

  @Post('transfers')
  @RequirePermissions('inventory:transfer')
  @ApiOperation({ summary: 'Create and complete stock transfer' })
  transferStock(@Body() dto: CreateStockTransferDto) {
    return this.inventoryService.transferStock(dto);
  }
}
