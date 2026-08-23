import api from '@/lib/api';

type Params = Record<string, string | number | undefined>;

export const productsService = {
  async getAll(params?: Params) {
    const response = await api.get('/products', { params });
    return response.data;
  },
  async getStats() {
    const response = await api.get('/products/stats');
    return response.data;
  },
  async create(payload: Record<string, unknown>) {
    const response = await api.post('/products', payload);
    return response.data;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const response = await api.patch(`/products/${id}`, payload);
    return response.data;
  },
  async mapMarketplace(id: string, payload: Record<string, unknown>) {
    const response = await api.post(`/products/${id}/marketplace-mappings`, payload);
    return response.data;
  },
};

export const inventoryService = {
  async getStock(params?: Params) {
    const response = await api.get('/inventory/stock', { params });
    return response.data;
  },
  async getStats() {
    const response = await api.get('/inventory/stats');
    return response.data;
  },
  async getWarehouses() {
    const response = await api.get('/inventory/warehouses');
    return response.data;
  },
  async adjustStock(id: string, payload: { quantity: number; notes?: string }) {
    const response = await api.post(`/inventory/stock/${id}/adjust`, payload);
    return response.data;
  },
  async opnameStock(id: string, payload: { quantity: number; notes?: string }) {
    const response = await api.post(`/inventory/stock/${id}/opname`, payload);
    return response.data;
  },
  async transferStock(payload: Record<string, unknown>) {
    const response = await api.post('/inventory/transfers', payload);
    return response.data;
  },
};

export const ordersService = {
  async getAll(params?: Params) {
    const response = await api.get('/orders', { params });
    return response.data;
  },
  async getStats() {
    const response = await api.get('/orders/stats');
    return response.data;
  },
  async updateStatus(id: string, payload: { status: string; notes?: string }) {
    const response = await api.patch(`/orders/${id}/status`, payload);
    return response.data;
  },
  async cancel(id: string, payload?: { notes?: string }) {
    const response = await api.post(`/orders/${id}/cancel`, payload || {});
    return response.data;
  },
  async getShippingLabel(id: string) {
    const response = await api.get(`/orders/${id}/shipping-label`);
    return response.data;
  },
};

export const customersService = {
  async getAll(params?: Params) {
    const response = await api.get('/customers', { params });
    return response.data;
  },
  async getStats() {
    const response = await api.get('/customers/stats');
    return response.data;
  },
};

export const queueService = {
  async getStats() {
    const response = await api.get('/queues');
    return response.data;
  },
  async getFailed(name: string) {
    const response = await api.get(`/queues/${name}/failed`);
    return response.data;
  },
  async retry(name: string, jobId: string) {
    const response = await api.post(`/queues/${name}/jobs/${jobId}/retry`);
    return response.data;
  },
};
