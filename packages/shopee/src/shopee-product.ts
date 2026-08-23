import { ShopeeClient } from './shopee-client';

export interface ShopeeItem {
  item_id: number;
  item_name: string;
  item_sku: string;
  description: string;
  price_info: Array<{ current_price: number; original_price: number; currency: string }>;
  stock_info_v2: { summary_info: { total_reserved_stock: number; total_available_stock: number } };
  image: { image_url_list: string[] };
  weight: number;
  status: string;
  create_time: number;
  update_time: number;
  model_list?: Array<{
    model_id: number;
    model_name: string;
    model_sku: string;
    price_info?: Array<{ current_price: number; original_price: number; currency: string }>;
    stock_info_v2?: { summary_info?: { total_reserved_stock: number; total_available_stock: number } };
  }>;
}

export interface ShopeeItemListResponse {
  item_id_list: number[];
  total_count: number;
  has_next_page: boolean;
  next_offset: number;
}

export class ShopeeProductService {
  constructor(private readonly client: ShopeeClient) {}

  /**
   * Get list of item IDs from the shop
   */
  async getItemList(offset = 0, pageSize = 50): Promise<ShopeeItemListResponse> {
    const res = await this.client.get<ShopeeItemListResponse>(
      '/api/v2/product/get_item_list',
      { offset, page_size: pageSize, item_status: 'NORMAL' },
    );
    if (res.error) throw new Error(`getItemList: ${res.error} - ${res.message}`);
    return res.response!;
  }

  /**
   * Get detailed item info for up to 50 items
   */
  async getItemBaseInfo(itemIds: number[]): Promise<ShopeeItem[]> {
    const res = await this.client.get<{ item_list: ShopeeItem[] }>(
      '/api/v2/product/get_item_base_info',
      { item_id_list: itemIds.join(','), need_tax_info: false, need_complaint_policy: false },
    );
    if (res.error) throw new Error(`getItemBaseInfo: ${res.error} - ${res.message}`);
    return res.response?.item_list ?? [];
  }

  /**
   * Update item price
   */
  async updatePrice(itemId: number, modelId: number, price: number): Promise<boolean> {
    const res = await this.client.post<{ failure_list: unknown[] }>(
      '/api/v2/product/update_price',
      {
        item_id: itemId,
        price_list: [{ model_id: modelId, original_price: price }],
      },
    );
    if (res.error) throw new Error(`updatePrice: ${res.error} - ${res.message}`);
    return (res.response?.failure_list?.length ?? 0) === 0;
  }

  /**
   * Update item stock
   */
  async updateStock(itemId: number, modelId: number, stock: number): Promise<boolean> {
    const res = await this.client.post<{ failure_list: unknown[] }>(
      '/api/v2/product/update_stock',
      {
        item_id: itemId,
        stock_list: [{ model_id: modelId, seller_stock: [{ stock }] }],
      },
    );
    if (res.error) throw new Error(`updateStock: ${res.error} - ${res.message}`);
    return (res.response?.failure_list?.length ?? 0) === 0;
  }

  /**
   * Fetch all items with pagination (generator)
   */
  async *getAllItems(): AsyncGenerator<ShopeeItem[]> {
    let offset = 0;
    const pageSize = 50;
    let hasMore = true;

    while (hasMore) {
      const list = await this.getItemList(offset, pageSize);
      if (!list.item_id_list?.length) break;

      // Fetch details in chunks of 50
      const items = await this.getItemBaseInfo(list.item_id_list);
      yield items;

      hasMore = list.has_next_page;
      offset = list.next_offset;

      // Respect rate limit
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}
