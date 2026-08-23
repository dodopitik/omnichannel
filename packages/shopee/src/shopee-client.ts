import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface ShopeeConfig {
  partnerId: number;
  partnerKey: string;
  shopId?: number;
  accessToken?: string;
  baseUrl?: string;
}

export interface ShopeeApiResponse<T = unknown> {
  error: string;
  message: string;
  response?: T;
  request_id?: string;
  warning?: string;
}

/**
 * Low-level Shopee API client
 * Handles signature generation, token refresh, and rate limiting
 */
export class ShopeeClient {
  private readonly http: AxiosInstance;
  private readonly config: Required<Pick<ShopeeConfig, 'partnerId' | 'partnerKey' | 'baseUrl'>> &
    Partial<Pick<ShopeeConfig, 'shopId' | 'accessToken'>>;

  constructor(config: ShopeeConfig) {
    this.config = {
      baseUrl: config.baseUrl ?? 'https://partner.shopeemobile.com',
      ...config,
    };

    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Signature Generation ──────────────────────────────────
  private generateSignature(path: string, timestamp: number, accessToken?: string): string {
    const partnerId = this.config.partnerId;
    const partnerKey = this.config.partnerKey;

    let baseStr = `${partnerId}${path}${timestamp}`;
    if (accessToken) baseStr += accessToken;
    if (this.config.shopId) baseStr += this.config.shopId;

    return crypto.createHmac('sha256', partnerKey).update(baseStr).digest('hex');
  }

  // ─── Generic Request ───────────────────────────────────────
  async request<T>(
    path: string,
    method: 'GET' | 'POST',
    data?: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<ShopeeApiResponse<T>> {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(path, timestamp, this.config.accessToken);

    const queryParams: Record<string, unknown> = {
      partner_id: this.config.partnerId,
      timestamp,
      sign,
      ...params,
    };

    if (this.config.accessToken) queryParams.access_token = this.config.accessToken;
    if (this.config.shopId) queryParams.shop_id = this.config.shopId;

    const response = await this.http.request<ShopeeApiResponse<T>>({
      method,
      url: path,
      params: queryParams,
      data: method === 'POST' ? data : undefined,
    });

    return response.data;
  }

  get<T>(path: string, params?: Record<string, unknown>) {
    return this.request<T>(path, 'GET', undefined, params);
  }

  post<T>(path: string, data?: Record<string, unknown>, params?: Record<string, unknown>) {
    return this.request<T>(path, 'POST', data, params);
  }

  // ─── Auth ──────────────────────────────────────────────────
  getAuthUrl(redirectUrl: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/auth_partner';
    const sign = this.generateSignature(path, timestamp);

    const params = new URLSearchParams({
      partner_id: String(this.config.partnerId),
      timestamp: String(timestamp),
      sign,
      redirect: redirectUrl,
    });

    return `${this.config.baseUrl}${path}?${params.toString()}`;
  }

  async getToken(code: string, shopId?: number): Promise<{ access_token: string; refresh_token: string; expire_in: number; shop_id: number }> {
    const res = await this.post<{ access_token: string; refresh_token: string; expire_in: number; shop_id: number }>(
      '/api/v2/auth/token/get',
      { code, partner_id: this.config.partnerId, ...(shopId ? { shop_id: shopId } : {}) },
    );
    if (res.error) throw new Error(`Shopee Auth Error: ${res.error} - ${res.message}`);
    return res.response!;
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expire_in: number }> {
    const res = await this.post<{ access_token: string; refresh_token: string; expire_in: number }>(
      '/api/v2/auth/access_token/get',
      { refresh_token: refreshToken, partner_id: this.config.partnerId, shop_id: this.config.shopId },
    );
    if (res.error) throw new Error(`Shopee Token Refresh Error: ${res.error} - ${res.message}`);
    return res.response!;
  }
}
