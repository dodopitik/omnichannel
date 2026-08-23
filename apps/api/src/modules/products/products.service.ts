import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@omnichannel/database';
import { generateSlug } from '@omnichannel/shared';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  CreateProductDto,
  MarketplaceMappingDto,
  ProductQueryDto,
  ProductVariantInputDto,
  UpdateProductDto,
} from './products.controller';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { barcode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          stockItems: { select: { totalStock: true, reservedStock: true, availableStock: true } },
          marketplaceProducts: {
            select: {
              marketplaceId: true,
              status: true,
              syncStatus: true,
              marketplace: { select: { name: true, type: true } },
            },
          },
          _count: { select: { variants: true } },
        },
      }),
      this.db.product.count({ where }),
    ]);

    return {
      items: items.map((product) => ({
        ...product,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
        stockSummary: product.stockItems.reduce(
          (summary, item) => ({
            totalStock: summary.totalStock + item.totalStock,
            reservedStock: summary.reservedStock + item.reservedStock,
            availableStock: summary.availableStock + item.availableStock,
          }),
          { totalStock: 0, reservedStock: 0, availableStock: 0 },
        ),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [total, active, draft, lowStock, mapped] = await Promise.all([
      this.db.product.count({ where: { deletedAt: null } }),
      this.db.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.db.product.count({ where: { deletedAt: null, status: 'DRAFT' } }),
      this.db.stockItem.count({ where: { availableStock: { lte: 10 }, product: { deletedAt: null } } }),
      this.db.marketplaceProduct.count(),
    ]);

    return { total, active, draft, lowStock, mapped };
  }

  async findOne(id: string) {
    const product = await this.db.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        brand: true,
        variants: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        stockItems: { include: { warehouse: true, variant: true } },
        marketplaceProducts: { include: { marketplace: true, variant: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.serializeProduct(product);
  }

  async create(dto: CreateProductDto) {
    const slug = await this.uniqueSlug(dto.name);
    const product = await this.db.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        slug,
        description: dto.description,
        status: (dto.status as never) || 'DRAFT',
        sellingPrice: new Prisma.Decimal(dto.sellingPrice || 0),
        costPrice: new Prisma.Decimal(dto.costPrice || 0),
        variants: dto.variants?.length
          ? {
              create: dto.variants.map((variant, index) => ({
                sku: variant.sku,
                name: variant.name,
                options: (variant.options || {}) as Prisma.InputJsonValue,
                sellingPrice: new Prisma.Decimal(variant.sellingPrice || dto.sellingPrice || 0),
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: { variants: true },
    });

    if (typeof dto.stock === 'number') {
      await this.upsertStock(product.id, null, dto.stock);
    }

    return this.findOne(product.id);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureProduct(id);
    await this.db.product.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name, slug: await this.uniqueSlug(dto.name, id) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status ? { status: dto.status as never } : {}),
        ...(dto.sellingPrice !== undefined ? { sellingPrice: new Prisma.Decimal(dto.sellingPrice) } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: new Prisma.Decimal(dto.costPrice) } : {}),
      },
    });
    return this.findOne(id);
  }

  async createVariant(productId: string, dto: ProductVariantInputDto) {
    await this.ensureProduct(productId);
    const variant = await this.db.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        name: dto.name,
        options: (dto.options || {}) as Prisma.InputJsonValue,
        sellingPrice: new Prisma.Decimal(dto.sellingPrice || 0),
      },
    });
    return variant;
  }

  async upsertMarketplaceMapping(productId: string, dto: MarketplaceMappingDto) {
    const product = await this.ensureProduct(productId);
    const marketplace = await this.db.marketplace.findFirst({
      where: { id: dto.marketplaceId, deletedAt: null },
    });
    if (!marketplace) throw new NotFoundException('Marketplace not found');

    return this.db.marketplaceProduct.upsert({
      where: {
        marketplaceId_marketplaceItemId_marketplaceModelId: {
          marketplaceId: dto.marketplaceId,
          marketplaceItemId: dto.marketplaceItemId,
          marketplaceModelId: (dto.marketplaceModelId || null) as any,
        },
      },
      update: {
        productId: product.id,
        marketplaceSku: dto.marketplaceSku || product.sku,
        title: product.name,
        price: product.sellingPrice,
      },
      create: {
        productId: product.id,
        marketplaceId: dto.marketplaceId,
        marketplaceItemId: dto.marketplaceItemId,
        marketplaceModelId: dto.marketplaceModelId || null,
        marketplaceSku: dto.marketplaceSku || product.sku,
        title: product.name,
        price: product.sellingPrice,
      },
    });
  }

  private async ensureProduct(id: string) {
    const product = await this.db.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async uniqueSlug(name: string, ignoreId?: string) {
    const base = generateSlug(name);
    let slug = base;
    let suffix = 1;
    while (await this.db.product.findFirst({ where: { slug, ...(ignoreId ? { id: { not: ignoreId } } : {}) } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  private async upsertStock(productId: string, variantId: string | null, quantity: number) {
    const warehouse = await this.db.warehouse.findFirst({
      where: { deletedAt: null, isDefault: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!warehouse) throw new BadRequestException('Default warehouse is not configured');

    await this.db.stockItem.upsert({
      where: { productId_variantId_warehouseId: { productId, variantId: variantId as any, warehouseId: warehouse.id } },
      update: { totalStock: quantity, availableStock: quantity, reservedStock: 0 },
      create: { productId, variantId, warehouseId: warehouse.id, totalStock: quantity, availableStock: quantity },
    });
  }

  private serializeProduct(product: any) {
    return {
      ...product,
      costPrice: Number(product.costPrice),
      sellingPrice: Number(product.sellingPrice),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      variants: product.variants?.map((variant: any) => ({
        ...variant,
        costPrice: Number(variant.costPrice),
        sellingPrice: Number(variant.sellingPrice),
      })),
      marketplaceProducts: product.marketplaceProducts?.map((mapping: any) => ({
        ...mapping,
        price: mapping.price ? Number(mapping.price) : null,
      })),
    };
  }
}
