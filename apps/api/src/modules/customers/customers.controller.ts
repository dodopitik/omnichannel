import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CustomersService } from './customers.service';

export class CustomerQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  marketplace?: string;
}

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Get customers' })
  findAll(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Get customer statistics' })
  getStats() {
    return this.customersService.getStats();
  }
}
