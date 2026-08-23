import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  permissionIds?: string[];
}

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.role.findMany({
      where: { deletedAt: null },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.db.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: { include: { permission: true } },
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async getAllPermissions() {
    return this.db.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.db.role.findFirst({ where: { name: dto.name, deletedAt: null } });
    if (existing) throw new ConflictException('Role name already exists');

    return this.db.role.create({
      data: {
        name: dto.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: dto.displayName,
        description: dto.description,
        permissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({ permissionId })),
            }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.db.role.findFirst({ where: { id, deletedAt: null } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem && dto.permissionIds) {
      // System roles can have permissions updated, but name cannot be changed
    }

    if (dto.permissionIds !== undefined) {
      await this.db.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissionIds.length > 0) {
        await this.db.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }

    const { permissionIds: _, ...updateData } = dto;
    return this.db.role.update({
      where: { id },
      data: updateData,
      include: { permissions: { include: { permission: true } } },
    });
  }

  async remove(id: string) {
    const role = await this.db.role.findFirst({ where: { id, deletedAt: null } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('Cannot delete system role');

    const userCount = await this.db.userRole.count({ where: { roleId: id } });
    if (userCount > 0) {
      throw new ConflictException(`Cannot delete role with ${userCount} assigned users`);
    }

    await this.db.role.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
