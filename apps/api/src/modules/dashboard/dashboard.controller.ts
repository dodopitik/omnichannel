import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

class ChartQueryDto {
  @ApiPropertyOptional({ enum: ['week', 'month', 'year'] })
  @IsOptional()
  @IsIn(['week', 'month', 'year'])
  period?: 'week' | 'month' | 'year' = 'month';
}

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('chart/sales')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get sales chart data' })
  getSalesChart(@Query() query: ChartQueryDto) {
    return this.dashboardService.getSalesChart(query.period);
  }

  @Get('top-products')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get top selling products' })
  getTopProducts() {
    return this.dashboardService.getTopProducts();
  }

  @Get('top-marketplaces')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get marketplace performance' })
  getTopMarketplaces() {
    return this.dashboardService.getTopMarketplaces();
  }

  @Get('low-stock')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get low stock products' })
  getLowStock() {
    return this.dashboardService.getLowStockProducts();
  }
}
