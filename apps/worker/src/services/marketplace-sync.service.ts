import { Injectable, Logger } from '@nestjs/common';
import {
  Marketplace,
  MarketplaceStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  SyncStatus,
} from '@omnichannel/database';
import { generateSlug } from '@omnichannel/shared';
import { MarketplaceConnectorFactory } from './marketplace-connector.factory';
import { WorkerDatabaseService } from './worker-database.service';

interface SyncOrderOptions {
  startTime?: number;
  orderSn?: string;
}

@Injectable()
export class MarketplaceSyncService {
  private readonly logger = new Logger(MarketplaceSyncService.name);

  constructor(
    private readonly db: WorkerDatabaseService,
    private readonly connectorFactory: MarketplaceConnectorFactory,
  ) {}

  async syncProducts(marketplaceId: string) {
    const marketplace = await this.getConnectedMarketplace(marketplaceId);
    const syncLog = await this.createSyncLog(marketplace.id, 'PRODUCT');
    let itemsSynced = 0;
    let itemsFailed = 0;

    await this.db.marketplace.update({
      where: { id: marketplace.id },
      data: { syncStatus: SyncStatus.SYNCING, lastSyncError: null },
    });

    try {
      const connector = this.connectorFactory.create(marketplace);
      for await (const batch of connector.syncProducts()) {
        for (const item of batch) {
          try {
            await this.upsertMarketplaceProduct(marketplace, item);
            itemsSynced += 1;
          } catch (error) {
            itemsFailed += 1;
            this.logger.error(`Failed to sync product ${item.marketplaceItemId}`, error);
          }
        }
      }

      await this.finishSyncLog(syncLog.id, itemsFailed ? SyncStatus.PARTIAL : SyncStatus.SUCCESS, itemsSynced, itemsFailed);
      await this.db.marketplace.update({
        where: { id: marketplace.id },
        data: { syncStatus: itemsFailed ? SyncStatus.PARTIAL : SyncStatus.SUCCESS, lastSyncAt: new Date() },
      });
    } catch (error) {
      await this.failSync(marketplace.id, syncLog.id, error);
      throw error;
    }
  }

  async syncOrders(marketplaceId: string, options: SyncOrderOptions = {}) {
    const marketplace = await this.getConnectedMarketplace(marketplaceId);
    const syncLog = await this.createSyncLog(marketplace.id, 'ORDER');
    let itemsSynced = 0;
    let itemsFailed = 0;

    await this.db.marketplace.update({
      where: { id: marketplace.id },
      data: { syncStatus: SyncStatus.SYNCING, lastSyncError: null },
    });

    try {
      const connector = this.connectorFactory.create(marketplace);
      if (options.orderSn) {
        const order = await connector.getOrder(options.orderSn);
        if (order) {
          await this.upsertMarketplaceOrder(marketplace, order);
          itemsSynced += 1;
        }
        await this.finishSyncLog(syncLog.id, SyncStatus.SUCCESS, itemsSynced, itemsFailed);
        await this.db.marketplace.update({
          where: { id: marketplace.id },
          data: { syncStatus: SyncStatus.SUCCESS, lastSyncAt: new Date() },
        });
        return;
      }

      const since = options.startTime
        ? new Date(options.startTime * 1000)
        : marketplace.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      for await (const batch of connector.syncOrders(since)) {
        for (const order of batch) {
          try {
            await this.upsertMarketplaceOrder(marketplace, order);
            itemsSynced += 1;
          } catch (error) {
            itemsFailed += 1;
            this.logger.error(`Failed to sync order ${order.marketplaceOrderId}`, error);
          }
        }
      }

      await this.finishSyncLog(syncLog.id, itemsFailed ? SyncStatus.PARTIAL : SyncStatus.SUCCESS, itemsSynced, itemsFailed);
      await this.db.marketplace.update({
        where: { id: marketplace.id },
        data: { syncStatus: itemsFailed ? SyncStatus.PARTIAL : SyncStatus.SUCCESS, lastSyncAt: new Date() },
      });
    } catch (error) {
      await this.failSync(marketplace.id, syncLog.id, error);
      throw error;
    }
  }

  async syncStock(marketplaceId: string, productIds?: string[]) {
    const marketplace = await this.getConnectedMarketplace(marketplaceId);
    const connector = this.connectorFactory.create(marketplace);
    const mappings = await this.db.marketplaceProduct.findMany({
      where: {
        marketplaceId,
        ...(productIds?.length ? { productId: { in: productIds } } : {}),
      },
      include: {
        product: { include: { stockItems: true } },
        variant: { include: { stockItems: true } },
      },
    });

    for (const mapping of mappings) {
      if (!mapping.marketplaceItemId) continue;
      const stockItems = mapping.variant?.stockItems || mapping.product.stockItems;
      const availableStock = stockItems.reduce((sum, item) => sum + item.availableStock, 0);

      await connector.updateStock(
        mapping.marketplaceItemId,
        availableStock,
        mapping.marketplaceModelId || undefined,
      );

      await this.db.marketplaceProduct.update({
        where: { id: mapping.id },
        data: { stock: availableStock, syncStatus: SyncStatus.SUCCESS, lastSyncAt: new Date(), syncError: null },
      });
    }
  }

  private async getConnectedMarketplace(id: string) {
    const marketplace = await this.db.marketplace.findFirst({ where: { id, deletedAt: null } });
    if (!marketplace) throw new Error(`Marketplace not found: ${id}`);
    if (marketplace.status !== MarketplaceStatus.CONNECTED) {
      throw new Error(`Marketplace is not connected: ${id}`);
    }
    if (!marketplace.accessToken) throw new Error(`Marketplace access token missing: ${id}`);
    return marketplace;
  }

  private async upsertMarketplaceProduct(marketplace: Marketplace, item: any) {
    const productSku = item.sku || `${marketplace.type}-${item.marketplaceItemId}`;
    const variantSku = item.modelSku || item.sku || `${productSku}-${item.marketplaceModelId || 'BASE'}`;
    const product = await this.db.product.upsert({
      where: { sku: productSku },
      update: {
        name: item.title,
        slug: `${generateSlug(item.title)}-${item.marketplaceItemId}`,
        status: this.mapProductStatus(item.status),
        sellingPrice: new Prisma.Decimal(item.price || 0),
        weight: item.weight,
        images: item.images,
        metadata: item.raw as Prisma.InputJsonValue,
      },
      create: {
        sku: productSku,
        name: item.title,
        slug: `${generateSlug(item.title)}-${item.marketplaceItemId}`,
        status: this.mapProductStatus(item.status),
        sellingPrice: new Prisma.Decimal(item.price || 0),
        weight: item.weight,
        images: item.images,
        metadata: item.raw as Prisma.InputJsonValue,
      },
    });

    const variant = item.marketplaceModelId
      ? await this.db.productVariant.upsert({
          where: { sku: variantSku },
          update: {
            productId: product.id,
            name: item.modelName || item.title,
            sellingPrice: new Prisma.Decimal(item.price || 0),
            options: { shopeeModelId: item.marketplaceModelId },
          },
          create: {
            productId: product.id,
            sku: variantSku,
            name: item.modelName || item.title,
            sellingPrice: new Prisma.Decimal(item.price || 0),
            options: { shopeeModelId: item.marketplaceModelId },
          },
        })
      : null;

    await this.upsertStock(product.id, variant?.id || null, item.stock || 0);

    await this.db.marketplaceProduct.upsert({
      where: {
        marketplaceId_marketplaceItemId_marketplaceModelId: {
          marketplaceId: marketplace.id,
          marketplaceItemId: item.marketplaceItemId,
          marketplaceModelId: item.marketplaceModelId || null,
        },
      },
      update: {
        productId: product.id,
        variantId: variant?.id,
        marketplaceSku: item.sku,
        marketplaceModelSku: item.modelSku,
        title: item.title,
        status: item.status,
        price: new Prisma.Decimal(item.price || 0),
        stock: item.stock || 0,
        syncStatus: SyncStatus.SUCCESS,
        lastSyncAt: new Date(),
        syncError: null,
        marketplaceData: item.raw as Prisma.InputJsonValue,
      },
      create: {
        productId: product.id,
        variantId: variant?.id,
        marketplaceId: marketplace.id,
        marketplaceItemId: item.marketplaceItemId,
        marketplaceModelId: item.marketplaceModelId || null,
        marketplaceSku: item.sku,
        marketplaceModelSku: item.modelSku,
        title: item.title,
        status: item.status,
        price: new Prisma.Decimal(item.price || 0),
        stock: item.stock || 0,
        syncStatus: SyncStatus.SUCCESS,
        lastSyncAt: new Date(),
        marketplaceData: item.raw as Prisma.InputJsonValue,
      },
    });
  }

  private async upsertStock(productId: string, variantId: string | null, availableStock: number) {
    const warehouse = await this.db.warehouse.findFirst({
      where: { deletedAt: null, isDefault: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!warehouse) return;

    const existing = await this.db.stockItem.findFirst({
      where: { productId, variantId, warehouseId: warehouse.id },
    });

    if (existing) {
      await this.db.stockItem.update({
        where: { id: existing.id },
        data: {
          totalStock: availableStock,
          availableStock,
          reservedStock: 0,
        },
      });
      return;
    }

    await this.db.stockItem.create({
      data: {
        productId,
        variantId,
        warehouseId: warehouse.id,
        totalStock: availableStock,
        availableStock,
        reservedStock: 0,
      },
    });
  }

  private async upsertMarketplaceOrder(marketplace: Marketplace, order: any) {
    const customer = await this.upsertCustomer(marketplace, order);
    const orderNumber = `${marketplace.type}-${order.marketplaceOrderId}`;

    const savedOrder = await this.db.order.upsert({
      where: { orderNumber },
      update: {
        customerId: customer.id,
        status: this.mapOrderStatus(order.status),
        subtotal: new Prisma.Decimal(order.subtotal || 0),
        shippingFee: new Prisma.Decimal(order.shippingFee || 0),
        totalAmount: new Prisma.Decimal(order.totalAmount || 0),
        currency: order.currency || 'IDR',
        shippingAddress: order.shippingAddress as Prisma.InputJsonValue,
        shippingMethod: order.courier,
        trackingNumber: order.trackingNumber,
        courier: order.courier,
        paidAt: order.paidAt,
        marketplaceData: order.raw as Prisma.InputJsonValue,
      },
      create: {
        orderNumber,
        marketplaceId: marketplace.id,
        marketplaceOrderId: order.marketplaceOrderId,
        customerId: customer.id,
        status: this.mapOrderStatus(order.status),
        subtotal: new Prisma.Decimal(order.subtotal || 0),
        shippingFee: new Prisma.Decimal(order.shippingFee || 0),
        totalAmount: new Prisma.Decimal(order.totalAmount || 0),
        currency: order.currency || 'IDR',
        shippingAddress: order.shippingAddress as Prisma.InputJsonValue,
        shippingMethod: order.courier,
        trackingNumber: order.trackingNumber,
        courier: order.courier,
        paidAt: order.paidAt,
        marketplaceData: order.raw as Prisma.InputJsonValue,
        createdAt: order.createdAt || new Date(),
      },
    });

    await this.db.orderItem.deleteMany({ where: { orderId: savedOrder.id } });
    for (const item of order.items || []) {
      const mapping = await this.db.marketplaceProduct.findFirst({
        where: {
          marketplaceId: marketplace.id,
          marketplaceItemId: item.marketplaceItemId,
          ...(item.marketplaceModelId ? { marketplaceModelId: item.marketplaceModelId } : {}),
        },
      });

      await this.db.orderItem.create({
        data: {
          orderId: savedOrder.id,
          productId: mapping?.productId,
          variantId: mapping?.variantId,
          sku: item.sku || `${marketplace.type}-${item.marketplaceItemId}`,
          name: item.name,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice || 0),
          totalPrice: new Prisma.Decimal(item.totalPrice || 0),
          metadata: item as Prisma.InputJsonValue,
        },
      });
    }

    await this.db.orderStatusHistory.create({
      data: {
        orderId: savedOrder.id,
        status: this.mapOrderStatus(order.status),
        notes: `Synced from ${marketplace.type}`,
      },
    });

    await this.refreshCustomerStats(customer.id);
  }

  private async upsertCustomer(marketplace: Marketplace, order: any) {
    const existing = await this.db.customer.findFirst({
      where: {
        deletedAt: null,
        marketplace: marketplace.type,
        marketplaceId: order.buyerPhone || order.buyerName || order.marketplaceOrderId,
      },
    });

    const data = {
      name: order.buyerName || 'Shopee Customer',
      phone: order.buyerPhone || null,
      marketplace: marketplace.type,
      marketplaceId: order.buyerPhone || order.buyerName || order.marketplaceOrderId,
      metadata: order.raw as Prisma.InputJsonValue,
    };

    if (existing) return this.db.customer.update({ where: { id: existing.id }, data });

    const customer = await this.db.customer.create({ data });
    if (order.shippingAddress?.address) {
      await this.db.customerAddress.create({
        data: {
          customerId: customer.id,
          label: marketplace.type,
          name: order.shippingAddress.name || data.name,
          phone: order.shippingAddress.phone || data.phone,
          address: order.shippingAddress.address,
          city: order.shippingAddress.city || '-',
          province: order.shippingAddress.province || '-',
          postalCode: order.shippingAddress.postalCode,
          isDefault: true,
        },
      });
    }
    return customer;
  }

  private async refreshCustomerStats(customerId: string) {
    const aggregate = await this.db.order.aggregate({
      where: { customerId, deletedAt: null },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    await this.db.customer.update({
      where: { id: customerId },
      data: {
        totalOrders: aggregate._count.id,
        totalSpending: aggregate._sum.totalAmount || new Prisma.Decimal(0),
      },
    });
  }

  private mapProductStatus(status: string) {
    return status === 'NORMAL' ? ProductStatus.ACTIVE : ProductStatus.INACTIVE;
  }

  private mapOrderStatus(status: string) {
    return (OrderStatus as Record<string, OrderStatus>)[status] || OrderStatus.PENDING;
  }

  private async createSyncLog(marketplaceId: string, type: string) {
    return this.db.syncLog.create({
      data: { marketplaceId, type, status: SyncStatus.SYNCING },
    });
  }

  private async finishSyncLog(id: string, status: SyncStatus, itemsSynced: number, itemsFailed: number) {
    const syncLog = await this.db.syncLog.findUnique({ where: { id } });
    await this.db.syncLog.update({
      where: { id },
      data: {
        status,
        itemsSynced,
        itemsFailed,
        completedAt: new Date(),
        duration: syncLog ? Date.now() - syncLog.startedAt.getTime() : undefined,
      },
    });
  }

  private async failSync(marketplaceId: string, syncLogId: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await this.db.syncLog.update({
      where: { id: syncLogId },
      data: { status: SyncStatus.FAILED, message, completedAt: new Date() },
    });
    await this.db.marketplace.update({
      where: { id: marketplaceId },
      data: { syncStatus: SyncStatus.FAILED, lastSyncError: message },
    });
  }
}
