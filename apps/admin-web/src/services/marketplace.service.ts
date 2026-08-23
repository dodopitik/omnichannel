import api from '@/lib/api';

export interface Marketplace {
  id: string;
  name: string;
  type: string;
  shopId?: string | null;
  shopName?: string | null;
  status: string;
  syncStatus: string;
  lastSyncAt?: string | null;
  webhookStatus: boolean;
  tokenExpiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number; products: number };
}

export const marketplaceService = {
  async getAll() {
    const response = await api.get('/marketplaces');
    return response.data;
  },

  async create(payload: { name: string; type: string }) {
    const response = await api.post('/marketplaces', payload);
    return response.data;
  },

  async getShopeeAuthUrl(id: string) {
    const response = await api.get(`/marketplaces/${id}/auth-url/shopee`);
    return response.data;
  },

  async sync(id: string) {
    const response = await api.post(`/marketplaces/${id}/sync`);
    return response.data;
  },

  async disconnect(id: string) {
    const response = await api.post(`/marketplaces/${id}/disconnect`);
    return response.data;
  },
};
