import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { AuditAction } from '@omnichannel/database';

export interface CreateAuditLogDto {
  userId?: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  entityType?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    await this.db.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        module: dto.module,
        entityId: dto.entityId,
        entityType: dto.entityType,
        oldValues: dto.oldValues ? (dto.oldValues as object) : undefined,
        newValues: dto.newValues ? (dto.newValues as object) : undefined,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        description: dto.description,
      },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    userId?: string;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.userId && { userId: query.userId }),
      ...(query.module && { module: query.module }),
      ...(query.action && { action: query.action as AuditAction }),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate && { gte: new Date(query.startDate) }),
              ...(query.endDate && { lte: new Date(query.endDate) }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.db.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }
}
