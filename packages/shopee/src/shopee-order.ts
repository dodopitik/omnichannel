import { ShopeeClient } from './shopee-client';

export interface ShopeeOrder {
  order_sn: string;
  order_status: string;
  buyer_username: string;
  buyer_user_id: number;
  create_time: number;
  update_time: number;
  pay_time?: number;
  ship_by_date: number;
  total_amount: number;
  currency: string;
  actual_shipping_fee: number;
  shipping_carrier: string;
  tracking_no: string;
  recipient_address: {
    name: string;
    phone: string;
    town: string;
    district: string;
    city: string;
    state: string;
    region: string;
    full_address: string;
    zipcode: string;
  };
  item_list: Array<{
    item_id: number;
    item_name: string;
    item_sku: string;
    model_id: number;
    model_name: string;
    model_sku: string;
    order_item_id: number;
    quantity_purchased: number;
    original_price: number;
    discounted_price: number;
  }>;
}

export interface ShopeeOrderListResponse {
  order_list: Array<{ order_sn: string; order_status: string }>;
  more: boolean;
  next_cursor: string;
  total_count: number;
}

export class ShopeeOrderService {
  constructor(private readonly client: ShopeeClient) {}

  /**
   * Get order list with cursor-based pagination
   */
  async getOrderList(options: {
    timeFrom: number;
    timeTo: number;
    pageSize?: number;
    cursor?: string;
    orderStatus?: string;
  }): Promise<ShopeeOrderListResponse> {
    const res = await this.client.get<ShopeeOrderListResponse>(
      '/api/v2/order/get_order_list',
      {
        time_range_field: 'create_time',
        time_from: options.timeFrom,
        time_to: options.timeTo,
        page_size: options.pageSize ?? 50,
        cursor: options.cursor ?? '',
        order_status: options.orderStatus ?? 'ALL',
        response_optional_fields: 'order_status',
      },
    );
    if (res.error) throw new Error(`getOrderList: ${res.error} - ${res.message}`);
    return res.response!;
  }

  /**
   * Get detailed order info for up to 50 orders
   */
  async getOrderDetails(orderSns: string[]): Promise<ShopeeOrder[]> {
    const res = await this.client.get<{ order_list: ShopeeOrder[] }>(
      '/api/v2/order/get_order_detail',
      {
        order_sn_list: orderSns.join(','),
        response_optional_fields: [
          'buyer_username', 'buyer_user_id', 'pay_time', 'recipient_address',
          'actual_shipping_fee', 'shipping_carrier', 'tracking_no', 'item_list',
        ].join(','),
      },
    );
    if (res.error) throw new Error(`getOrderDetails: ${res.error} - ${res.message}`);
    return res.response?.order_list ?? [];
  }

  async getOrderDetail(orderSn: string): Promise<ShopeeOrder | null> {
    const orders = await this.getOrderDetails([orderSn]);
    return orders[0] ?? null;
  }

  /**
   * Get shipping document (label) URL
   */
  async getShippingDocument(orderSn: string): Promise<string> {
    const res = await this.client.post<{ result: Array<{ url: string }> }>(
      '/api/v2/logistics/download_shipping_document',
      {
        order_list: [{ order_sn: orderSn, package_number: '' }],
        shipping_document_type: 'NORMAL_AIR_WAYBILL',
      },
    );
    if (res.error) throw new Error(`getShippingDocument: ${res.error}`);
    return res.response?.result?.[0]?.url ?? '';
  }

  /**
   * Fetch all orders in a time range (generator)
   */
  async *getAllOrders(timeFrom: number, timeTo: number): AsyncGenerator<ShopeeOrder[]> {
    let cursor = '';
    let hasMore = true;

    while (hasMore) {
      const list = await this.getOrderList({ timeFrom, timeTo, cursor, pageSize: 50 });
      const orderSns = list.order_list.map((o) => o.order_sn);

      if (!orderSns.length) break;

      const details = await this.getOrderDetails(orderSns);
      yield details;

      hasMore = list.more;
      cursor = list.next_cursor;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}
