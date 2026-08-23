import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { getDayRange, getMonthRange } from '@omnichannel/shared';

@Injectable()
export class DashboardService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_KEY = 'dashboard:stats';

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async getStats() {
    // Try cache first
    const cached = await this.redis.getJson<unknown>(this.CACHE_KEY);
    if (cached) return cached;

    const stats = await this.computeStats();
    await this.redis.setJson(this.CACHE_KEY, stats, this.CACHE_TTL);
    return stats;
  }

  async getSalesChart(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = 'day';
    }

    // Raw query for sales chart data
    const orders = await this.db.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['PAID', 'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'] },
        deletedAt: null,
      },
      select: {
        createdAt: true,
        totalAmount: true,
        profit: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by period
    const grouped = new Map<string, { revenue: number; profit: number; orders: number }>();

    for (const order of orders) {
      let key: string;
      const d = order.createdAt;

      if (groupBy === 'day') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = grouped.get(key) || { revenue: 0, profit: 0, orders: 0 };
      grouped.set(key, {
        revenue: existing.revenue + Number(order.totalAmount),
        profit: existing.profit + Number(order.profit || 0),
        orders: existing.orders + 1,
      });
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  async getTopProducts(limit = 10) {
    const { start, end } = getMonthRange();

    const result = await this.db.orderItem.groupBy({
      by: ['productId', 'name'],
      where: {
        order: {
          status: { in: ['PAID', 'PACKED', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'] },
          createdAt: { gte: start, lte: end },
          deletedAt: null,
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    });

    return result.map((item) => ({
      productId: item.productId,
      name: item.name,
      totalSold: item._sum.quantity || 0,
      totalRevenue: Number(item._sum.totalPrice || 0),
    }));
  }

  async getTopMarketplaces() {
    const { start, end } = getMonthRange();

    const marketplaces = await this.db.marketplace.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        orders: {
          where: {
            createdAt: { gte: start, lte: end },
            status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
            deletedAt: null,
          },
          select: { totalAmount: true, profit: true },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    return marketplaces.map((mp) => ({
      id: mp.id,
      name: mp.name,
      type: mp.type,
      totalOrders: mp.orders.length,
      totalRevenue: mp.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      totalProfit: mp.orders.reduce((sum, o) => sum + Number(o.profit || 0), 0),
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getLowStockProducts(threshold = 10, limit = 20) {
    return this.db.stockItem.findMany({
      where: {
        availableStock: { lte: threshold },
        product: { deletedAt: null, status: 'ACTIVE' },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, images: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { availableStock: 'asc' },
      take: limit,
    });
  }

  private async computeStats() {
    const { start: todayStart, end: todayEnd } = getDayRange();
    const { start: monthStart, end: monthEnd } = getMonthRange();

    const [
      ordersToday,
      pendingOrders,
      packingOrders,
      pickupOrders,
      cancelOrders,
      returnOrders,
      monthRevenue,
      monthProfit,
      totalProducts,
      totalMarketplaces,
      lowStockCount,
    ] = await Promise.all([
      this.db.order.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
      }),
      this.db.order.count({ where: { status: 'PENDING', deletedAt: null } }),
      this.db.order.count({ where: { status: 'PACKED', deletedAt: null } }),
      this.db.order.count({ where: { status: 'READY_TO_SHIP', deletedAt: null } }),
      this.db.order.count({
        where: {
          status: 'CANCELLED',
          createdAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      }),
      this.db.order.count({
        where: {
          status: { in: ['RETURNED', 'REFUNDED'] },
          createdAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      }),
      this.db.order.aggregate({
        where: {
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
          createdAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        _sum: { totalAmount: true },
      }),
      this.db.order.aggregate({
        where: {
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
          createdAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
        _sum: { profit: true },
      }),
      this.db.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.db.marketplace.count({ where: { deletedAt: null, isActive: true } }),
      this.db.stockItem.count({ where: { availableStock: { lte: 10 } } }),
    ]);

    return {
      orders: {
        today: ordersToday,
        pending: pendingOrders,
        packing: packingOrders,
        pickup: pickupOrders,
        cancel: cancelOrders,
        return: returnOrders,
      },
      revenue: {
        thisMonth: Number(monthRevenue._sum.totalAmount || 0),
        profit: Number(monthProfit._sum.profit || 0),
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
      },
      marketplaces: {
        total: totalMarketplaces,
      },
    };
  }
}
