import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@omnichannel/database';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { AdjustStockDto, CreateStockTransferDto, InventoryQueryDto } from './inventory.controller';

@Injectable()
export class InventoryService {
  constructor(private readonly db: DatabaseService) {}

  async findStock(query: InventoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockItemWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      product: {
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { sku: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };

    const [items, total] = await Promise.all([
      this.db.stockItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sortBy || 'updatedAt']: query.sortOrder || 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, status: true } },
          variant: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      this.db.stockItem.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  getWarehouses() {
    return this.db.warehouse.findMany({
      where: { deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async getStats() {
    const [warehouses, stock, lowStock, outOfStock] = await Promise.all([
      this.db.warehouse.count({ where: { deletedAt: null, isActive: true } }),
      this.db.stockItem.aggregate({
        _sum: { totalStock: true, reservedStock: true, availableStock: true, incomingStock: true },
      }),
      this.db.stockItem.count({ where: { availableStock: { gt: 0, lte: 10 } } }),
      this.db.stockItem.count({ where: { availableStock: 0 } }),
    ]);

    return {
      warehouses,
      totalStock: stock._sum.totalStock || 0,
      reservedStock: stock._sum.reservedStock || 0,
      availableStock: stock._sum.availableStock || 0,
      incomingStock: stock._sum.incomingStock || 0,
      lowStock,
      outOfStock,
    };
  }

  async adjustStock(id: string, dto: AdjustStockDto) {
    const stockItem = await this.getStockItem(id);
    const after = stockItem.availableStock + dto.quantity;
    if (after < 0) throw new BadRequestException('Available stock cannot be negative');

    return this.db.$transaction(async (tx) => {
      const updated = await tx.stockItem.update({
        where: { id },
        data: {
          totalStock: stockItem.totalStock + dto.quantity,
          availableStock: after,
        },
      });
      await tx.stockMovement.create({
        data: {
          stockItemId: id,
          type: 'ADJUSTMENT',
          quantity: dto.quantity,
          beforeQty: stockItem.availableStock,
          afterQty: after,
          notes: dto.notes,
        },
      });
      return updated;
    });
  }

  async opnameStock(id: string, dto: AdjustStockDto) {
    const stockItem = await this.getStockItem(id);
    const counted = dto.quantity;
    if (counted < 0) throw new BadRequestException('Counted stock cannot be negative');
    const delta = counted - stockItem.availableStock;

    return this.db.$transaction(async (tx) => {
      const updated = await tx.stockItem.update({
        where: { id },
        data: {
          totalStock: stockItem.totalStock + delta,
          availableStock: counted,
        },
      });
      await tx.stockMovement.create({
        data: {
          stockItemId: id,
          type: 'OPNAME',
          quantity: delta,
          beforeQty: stockItem.availableStock,
          afterQty: counted,
          notes: dto.notes,
        },
      });
      return updated;
    });
  }

  async transferStock(dto: CreateStockTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouse must be different');
    }
    if (!dto.items.length) throw new BadRequestException('Transfer items are required');

    return this.db.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          status: 'COMPLETED',
          notes: dto.notes,
          completedAt: new Date(),
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              variantId: (item.variantId || null) as any,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        if (item.quantity <= 0) throw new BadRequestException('Transfer quantity must be positive');
        const from = await tx.stockItem.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
            warehouseId: dto.fromWarehouseId,
          },
        });
        if (!from || from.availableStock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
        }

        const to = await tx.stockItem.upsert({
          where: {
            productId_variantId_warehouseId: {
              productId: item.productId,
              variantId: (item.variantId || null) as any,
              warehouseId: dto.toWarehouseId,
            },
          },
          update: {
            totalStock: { increment: item.quantity },
            availableStock: { increment: item.quantity },
          },
          create: {
            productId: item.productId,
            variantId: item.variantId || null,
            warehouseId: dto.toWarehouseId,
            totalStock: item.quantity,
            availableStock: item.quantity,
          },
        });

        await tx.stockItem.update({
          where: { id: from.id },
          data: {
            totalStock: { decrement: item.quantity },
            availableStock: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.createMany({
          data: [
            {
              stockItemId: from.id,
              type: 'TRANSFER_OUT',
              quantity: -item.quantity,
              beforeQty: from.availableStock,
              afterQty: from.availableStock - item.quantity,
              reference: 'stock_transfer',
              referenceId: transfer.id,
            },
            {
              stockItemId: to.id,
              type: 'TRANSFER_IN',
              quantity: item.quantity,
              beforeQty: to.availableStock - item.quantity,
              afterQty: to.availableStock,
              reference: 'stock_transfer',
              referenceId: transfer.id,
            },
          ],
        });
      }

      return transfer;
    });
  }

  private async getStockItem(id: string) {
    const stockItem = await this.db.stockItem.findUnique({ where: { id } });
    if (!stockItem) throw new NotFoundException('Stock item not found');
    return stockItem;
  }
}
