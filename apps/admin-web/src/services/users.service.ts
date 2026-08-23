import api from '@/lib/api';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  roles: Array<{ role: { name: string; displayName: string } }>;
}

export interface CreateUserPayload {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status?: string;
  roleIds?: string[];
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  roleIds?: string[];
}

export const usersService = {
  async getAll(params?: Record<string, unknown>) {
    const response = await api.get('/users', { params });
    return response.data;
  },

  async getOne(id: string) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async create(payload: CreateUserPayload) {
    const response = await api.post('/users', payload);
    return response.data;
  },

  async update(id: string, payload: UpdateUserPayload) {
    const response = await api.patch(`/users/${id}`, payload);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  async getStats() {
    const response = await api.get('/users/stats');
    return response.data;
  },
};

export const rolesService = {
  async getAll() {
    const response = await api.get('/roles');
    return response.data;
  },

  async getPermissions() {
    const response = await api.get('/roles/permissions');
    return response.data;
  },

  async create(payload: { name: string; displayName: string; description?: string; permissionIds?: string[] }) {
    const response = await api.post('/roles', payload);
    return response.data;
  },

  async update(id: string, payload: { displayName?: string; description?: string; permissionIds?: string[] }) {
    const response = await api.patch(`/roles/${id}`, payload);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  },
};
