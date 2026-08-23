import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@omnichannel/database';
import { getDayRange } from '@omnichannel/shared';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { MarketplaceConnectorFactory } from '../marketplace/marketplace-connector.factory';
import { OrderQueryDto, UpdateOrderStatusDto } from './orders.controller';

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly connectorFactory: MarketplaceConnectorFactory,
  ) {}

  async findAll(query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.marketplaceId ? { marketplaceId: query.marketplaceId } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { marketplaceOrderId: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          marketplace: { select: { id: true, name: true, type: true } },
          customer: { select: { id: true, name: true, phone: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      this.db.order.count({ where }),
    ]);

    return {
      items: items.map((order) => ({
        ...order,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        discount: Number(order.discount),
        tax: Number(order.tax),
        totalAmount: Number(order.totalAmount),
        profit: order.profit ? Number(order.profit) : null,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const { start, end } = getDayRange();
    const [today, pending, paid, packed, shipped, completed, cancelled, revenue] = await Promise.all([
      this.db.order.count({ where: { createdAt: { gte: start, lte: end }, deletedAt: null } }),
      this.db.order.count({ where: { status: 'PENDING', deletedAt: null } }),
      this.db.order.count({ where: { status: 'PAID', deletedAt: null } }),
      this.db.order.count({ where: { status: 'PACKED', deletedAt: null } }),
      this.db.order.count({ where: { status: 'SHIPPED', deletedAt: null } }),
      this.db.order.count({ where: { status: 'COMPLETED', deletedAt: null } }),
      this.db.order.count({ where: { status: 'CANCELLED', deletedAt: null } }),
      this.db.order.aggregate({
        where: { status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      today,
      pending,
      paid,
      packed,
      shipped,
      completed,
      cancelled,
      revenue: Number(revenue._sum.totalAmount || 0),
    };
  }

  async findOne(id: string) {
    const order = await this.db.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        marketplace: true,
        customer: { include: { addresses: true } },
        items: { include: { product: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.serializeOrder(order);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const existing = await this.db.order.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Order not found');

    const now = new Date();
    const status = dto.status as never;
    await this.db.order.update({
      where: { id },
      data: {
        status,
        ...(dto.status === 'PACKED' ? { packedAt: now } : {}),
        ...(dto.status === 'SHIPPED' ? { shippedAt: now } : {}),
        ...(dto.status === 'COMPLETED' ? { completedAt: now } : {}),
        ...(dto.status === 'CANCELLED' ? { cancelledAt: now } : {}),
        ...(dto.status === 'RETURNED' ? { returnedAt: now } : {}),
      },
    });

    await this.db.orderStatusHistory.create({
      data: {
        orderId: id,
        status,
        notes: dto.notes || `Status changed from ${existing.status} to ${dto.status}`,
      },
    });

    return this.findOne(id);
  }

  async getShippingLabel(id: string) {
    const order = await this.db.order.findFirst({
      where: { id, deletedAt: null },
      include: { marketplace: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.marketplace.status !== 'CONNECTED') throw new BadRequestException('Marketplace is not connected');

    const connector = this.connectorFactory.create(order.marketplace);
    const url = await connector.getShippingDocument(order.marketplaceOrderId);
    return { url };
  }

  private serializeOrder(order: any) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      discount: Number(order.discount),
      tax: Number(order.tax),
      totalAmount: Number(order.totalAmount),
      profit: order.profit ? Number(order.profit) : null,
      items: order.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        costPrice: item.costPrice ? Number(item.costPrice) : null,
      })),
    };
  }
}
