import api from '@/lib/api';

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const response = await api.post('/auth/login', payload);
    return response.data;
  },

  async register(payload: RegisterPayload) {
    const response = await api.post('/auth/register', payload);
    return response.data;
  },

  async logout(refreshToken?: string) {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  async refreshToken(refreshToken: string) {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string) {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  async verifyEmail(token: string) {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
