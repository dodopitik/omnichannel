import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService, CreateRoleDto, UpdateRoleDto } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get all roles' })
  findAll() { return this.rolesService.findAll(); }

  @Get('permissions')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get all available permissions' })
  getPermissions() { return this.rolesService.getAllPermissions(); }

  @Get(':id')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(@Param('id') id: string) { return this.rolesService.findOne(id); }

  @Post()
  @RequirePermissions('roles:create')
  @ApiOperation({ summary: 'Create new role' })
  create(@Body() dto: CreateRoleDto) { return this.rolesService.create(dto); }

  @Patch(':id')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Update role' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  remove(@Param('id') id: string) { return this.rolesService.remove(id); }
}
