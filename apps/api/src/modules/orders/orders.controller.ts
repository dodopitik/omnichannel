import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OrdersService } from './orders.service';

export class OrderQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  marketplaceId?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Get marketplace orders' })
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Get order statistics' })
  getStats() {
    return this.ordersService.getStats();
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Get order detail' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermissions('orders:update')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('orders:cancel')
  @ApiOperation({ summary: 'Cancel order locally' })
  cancel(@Param('id') id: string, @Body() dto: { notes?: string }) {
    return this.ordersService.updateStatus(id, { status: 'CANCELLED', notes: dto?.notes || 'Cancelled locally' });
  }

  @Get(':id/shipping-label')
  @RequirePermissions('orders:read')
  @ApiOperation({ summary: 'Get marketplace shipping label URL when supported' })
  getShippingLabel(@Param('id') id: string) {
    return this.ordersService.getShippingLabel(id);
  }
}
