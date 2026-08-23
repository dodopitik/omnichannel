import api from '@/lib/api';

export const dashboardService = {
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  async getSalesChart(period: 'week' | 'month' | 'year' = 'month') {
    const response = await api.get('/dashboard/chart/sales', { params: { period } });
    return response.data;
  },

  async getTopProducts() {
    const response = await api.get('/dashboard/top-products');
    return response.data;
  },

  async getTopMarketplaces() {
    const response = await api.get('/dashboard/top-marketplaces');
    return response.data;
  },

  async getLowStock() {
    const response = await api.get('/dashboard/low-stock');
    return response.data;
  },
};
