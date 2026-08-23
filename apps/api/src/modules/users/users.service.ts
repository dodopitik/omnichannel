import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createPaginationMeta, getPaginationOffset } from '@omnichannel/shared';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  private sanitizeUser<T extends { password?: string | null; twoFactorSecret?: string | null }>(user: T) {
    const { password: _password, twoFactorSecret: _twoFactorSecret, ...safeUser } = user;
    return safeUser;
  }

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const { skip, take } = getPaginationOffset(page, limit);

    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { username: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          roles: { include: { role: true } },
        },
      }),
      this.db.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.sanitizeUser(user)),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const user = await this.db.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async create(dto: CreateUserDto, createdBy?: string) {
    // Check uniqueness
    const [existingEmail, existingUsername] = await Promise.all([
      this.db.user.findFirst({ where: { email: dto.email, deletedAt: null } }),
      this.db.user.findFirst({ where: { username: dto.username, deletedAt: null } }),
    ]);

    if (existingEmail) throw new ConflictException('Email already exists');
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.db.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: (dto.status as any) || 'ACTIVE',
        emailVerifiedAt: dto.status === 'ACTIVE' ? new Date() : undefined,
        roles: dto.roleIds?.length
          ? {
              create: dto.roleIds.map((roleId) => ({
                roleId,
                createdBy,
              })),
            }
          : undefined,
      },
      include: { roles: { include: { role: true } } },
    });

    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, updatedBy?: string) {
    const user = await this.db.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    // Update roles if provided
    if (dto.roleIds !== undefined) {
      await this.db.userRole.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length > 0) {
        await this.db.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId, createdBy: updatedBy })),
        });
      }
    }

    const { roleIds: _, ...updateData } = dto;
    const updated = await this.db.user.update({
      where: { id },
      data: { ...updateData, status: updateData.status as any, updatedAt: new Date() },
      include: { roles: { include: { role: true } } },
    });

    return this.sanitizeUser(updated);
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const user = await this.db.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    // Check if super_admin
    const roles = await this.db.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    });
    const isSuperAdmin = roles.some((r) => r.role.name === 'super_admin');
    if (isSuperAdmin) throw new ForbiddenException('Cannot delete super admin account');

    await this.db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getUserStats() {
    const [total, active, inactive, pending] = await Promise.all([
      this.db.user.count({ where: { deletedAt: null } }),
      this.db.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.db.user.count({ where: { deletedAt: null, status: 'INACTIVE' } }),
      this.db.user.count({ where: { deletedAt: null, status: 'PENDING_VERIFICATION' } }),
    ]);
    return { total, active, inactive, pending };
  }
}
