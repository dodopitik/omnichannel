/**
 * Shopee Marketplace Connector
 *
 * Implements the Connector Pattern — all marketplace integrations
 * must implement the IMarketplaceConnector interface so business
 * logic never has marketplace-specific code.
 */

import { ShopeeClient, ShopeeConfig } from './shopee-client';
import { ShopeeProductService } from './shopee-product';
import { ShopeeOrderService } from './shopee-order';

export interface MarketplaceProduct {
  marketplaceItemId: string;
  marketplaceModelId?: string;
  title: string;
  sku: string;
  modelSku?: string;
  modelName?: string;
  price: number;
  stock: number;
  status: string;
  images: string[];
  weight?: number;
  raw: unknown;
}

export interface MarketplaceOrder {
  marketplaceOrderId: string;
  status: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  items: Array<{
    marketplaceItemId: string;
    marketplaceModelId?: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  courier: string;
  trackingNumber: string;
  paidAt?: Date;
  createdAt: Date;
  raw: unknown;
}

export interface IMarketplaceConnector {
  getAuthUrl(redirectUrl: string): string;
  exchangeToken(code: string, shopId?: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date; shopId: string }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }>;
  syncProducts(): AsyncGenerator<MarketplaceProduct[]>;
  syncOrders(since: Date): AsyncGenerator<MarketplaceOrder[]>;
  getOrder(orderSn: string): Promise<MarketplaceOrder | null>;
  getShippingDocument(orderSn: string): Promise<string>;
  updateStock(marketplaceItemId: string, stock: number, marketplaceModelId?: string): Promise<boolean>;
  updatePrice(marketplaceItemId: string, price: number, marketplaceModelId?: string): Promise<boolean>;
}

/**
 * Shopee implementation of IMarketplaceConnector
 */
export class ShopeeConnector implements IMarketplaceConnector {
  private readonly client: ShopeeClient;
  private readonly productService: ShopeeProductService;
  private readonly orderService: ShopeeOrderService;

  constructor(config: ShopeeConfig) {
    this.client = new ShopeeClient(config);
    this.productService = new ShopeeProductService(this.client);
    this.orderService = new ShopeeOrderService(this.client);
  }

  getAuthUrl(redirectUrl: string): string {
    return this.client.getAuthUrl(redirectUrl);
  }

  async exchangeToken(code: string, shopId?: string) {
    const token = await this.client.getToken(code, shopId ? Number(shopId) : undefined);
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expire_in * 1000),
      shopId: String(token.shop_id),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const token = await this.client.refreshToken(refreshToken);
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expire_in * 1000),
    };
  }

  async *syncProducts(): AsyncGenerator<MarketplaceProduct[]> {
    for await (const batch of this.productService.getAllItems()) {
      yield batch.flatMap<MarketplaceProduct>((item) => {
        if (item.model_list?.length) {
          return item.model_list.map((model) => ({
            marketplaceItemId: String(item.item_id),
            marketplaceModelId: String(model.model_id),
            title: item.item_name,
            sku: item.item_sku || model.model_sku || `SHOPEE-${item.item_id}`,
            modelSku: model.model_sku,
            modelName: model.model_name,
            price: model.price_info?.[0]?.current_price ?? item.price_info?.[0]?.current_price ?? 0,
            stock:
              model.stock_info_v2?.summary_info?.total_available_stock ??
              item.stock_info_v2?.summary_info?.total_available_stock ??
              0,
            status: item.status,
            images: item.image?.image_url_list ?? [],
            weight: item.weight,
            raw: { item, model },
          }));
        }

        return [{
          marketplaceItemId: String(item.item_id),
          title: item.item_name,
          sku: item.item_sku || `SHOPEE-${item.item_id}`,
          price: item.price_info?.[0]?.current_price ?? 0,
          stock: item.stock_info_v2?.summary_info?.total_available_stock ?? 0,
          status: item.status,
          images: item.image?.image_url_list ?? [],
          weight: item.weight,
          raw: item,
        }];
      });
    }
  }

  async *syncOrders(since: Date): AsyncGenerator<MarketplaceOrder[]> {
    const timeFrom = Math.floor(since.getTime() / 1000);
    const timeTo = Math.floor(Date.now() / 1000);

    for await (const batch of this.orderService.getAllOrders(timeFrom, timeTo)) {
      yield batch.map((order) => this.mapOrder(order));
    }
  }

  async updateStock(marketplaceItemId: string, stock: number, marketplaceModelId?: string): Promise<boolean> {
    return this.productService.updateStock(Number(marketplaceItemId), Number(marketplaceModelId || 0), stock);
  }

  async getOrder(orderSn: string): Promise<MarketplaceOrder | null> {
    const order = await this.orderService.getOrderDetail(orderSn);
    return order ? this.mapOrder(order) : null;
  }

  async getShippingDocument(orderSn: string): Promise<string> {
    return this.orderService.getShippingDocument(orderSn);
  }

  async updatePrice(marketplaceItemId: string, price: number, marketplaceModelId?: string): Promise<boolean> {
    return this.productService.updatePrice(Number(marketplaceItemId), Number(marketplaceModelId || 0), price);
  }

  private mapOrderStatus(shopeeStatus: string): string {
    const map: Record<string, string> = {
      UNPAID: 'PENDING',
      READY_TO_SHIP: 'PAID',
      PROCESSED: 'PACKED',
      SHIPPED: 'SHIPPED',
      COMPLETED: 'COMPLETED',
      IN_CANCEL: 'CANCELLED',
      CANCELLED: 'CANCELLED',
      TO_RETURN: 'RETURNED',
    };
    return map[shopeeStatus] ?? 'PENDING';
  }

  private mapOrder(order: any): MarketplaceOrder {
    return {
      marketplaceOrderId: order.order_sn,
      status: this.mapOrderStatus(order.order_status),
      buyerName: order.recipient_address?.name ?? order.buyer_username,
      buyerPhone: order.recipient_address?.phone ?? '',
      shippingAddress: {
        name: order.recipient_address?.name ?? '',
        phone: order.recipient_address?.phone ?? '',
        address: order.recipient_address?.full_address ?? '',
        city: order.recipient_address?.city ?? '',
        province: order.recipient_address?.state ?? '',
        postalCode: order.recipient_address?.zipcode ?? '',
      },
      items: (order.item_list ?? []).map((item: any) => ({
        marketplaceItemId: String(item.item_id),
        marketplaceModelId: item.model_id ? String(item.model_id) : undefined,
        name: item.item_name,
        sku: item.item_sku || item.model_sku,
        quantity: item.quantity_purchased,
        unitPrice: item.discounted_price,
        totalPrice: item.discounted_price * item.quantity_purchased,
      })),
      subtotal: order.total_amount - order.actual_shipping_fee,
      shippingFee: order.actual_shipping_fee,
      totalAmount: order.total_amount,
      currency: order.currency,
      courier: order.shipping_carrier,
      trackingNumber: order.tracking_no ?? '',
      paidAt: order.pay_time ? new Date(order.pay_time * 1000) : undefined,
      createdAt: new Date(order.create_time * 1000),
      raw: order,
    };
  }
}
