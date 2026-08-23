import { Injectable } from '@nestjs/common';
import { Prisma } from '@omnichannel/database';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { CustomerQueryDto } from './customers.controller';

@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(query: CustomerQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(query.marketplace ? { marketplace: query.marketplace as never } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sortBy || 'updatedAt']: query.sortOrder || 'desc' },
        include: {
          addresses: { take: 1, orderBy: { isDefault: 'desc' } },
          _count: { select: { orders: true } },
        },
      }),
      this.db.customer.count({ where }),
    ]);

    return {
      items: items.map((customer) => ({
        ...customer,
        totalSpending: Number(customer.totalSpending),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [total, blacklisted, repeatCustomers, spending] = await Promise.all([
      this.db.customer.count({ where: { deletedAt: null } }),
      this.db.customer.count({ where: { deletedAt: null, isBlacklisted: true } }),
      this.db.customer.count({ where: { deletedAt: null, totalOrders: { gt: 1 } } }),
      this.db.customer.aggregate({
        where: { deletedAt: null },
        _sum: { totalSpending: true },
        _avg: { totalSpending: true },
      }),
    ]);

    return {
      total,
      blacklisted,
      repeatCustomers,
      totalSpending: Number(spending._sum.totalSpending || 0),
      averageSpending: Number(spending._avg.totalSpending || 0),
    };
  }
}
