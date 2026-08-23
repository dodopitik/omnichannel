// ─── HTTP Status Codes ───────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── Queue Names ─────────────────────────────────────────────
export const QUEUE_NAMES = {
  SYNC_PRODUCT: 'sync-product',
  SYNC_STOCK: 'sync-stock',
  SYNC_ORDER: 'sync-order',
  REFRESH_TOKEN: 'refresh-marketplace-token',
  WEBHOOK: 'process-webhook',
  NOTIFICATION: 'send-notification',
  EMAIL: 'send-email',
  RETRY_FAILED: 'retry-failed',
} as const;

// ─── Cache Keys ───────────────────────────────────────────────
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USER_PERMISSIONS: (id: string) => `user:${id}:permissions`,
  DASHBOARD_STATS: 'dashboard:stats',
  MARKETPLACE_LIST: 'marketplace:list',
  PRODUCT_LIST: 'product:list',
} as const;

// ─── Cache TTL (seconds) ──────────────────────────────────────
export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
} as const;

// ─── Pagination Defaults ──────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ─── JWT ──────────────────────────────────────────────────────
export const JWT = {
  ACCESS_EXPIRES: '15m',
  REFRESH_EXPIRES: '7d',
  REFRESH_EXPIRES_REMEMBER: '30d',
} as const;

// ─── Marketplace Rate Limits ──────────────────────────────────
export const RATE_LIMITS = {
  SHOPEE: {
    REQUESTS_PER_SECOND: 10,
    REQUESTS_PER_MINUTE: 600,
  },
} as const;
