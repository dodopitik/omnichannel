import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get all users (paginated)' })
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user statistics' })
  getStats() {
    return this.usersService.getUserStats();
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create new user' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.remove(id, user.sub);
  }
}
