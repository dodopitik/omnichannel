// Re-export shared UI utilities
// Components are consumed directly from apps/admin-web/src/components/ui
// This package provides shared types and constants for UI

export const UI_VERSION = '1.0.0';

export const MARKETPLACE_COLORS = {
  SHOPEE: { bg: 'bg-orange-500', text: 'text-white', hex: '#EE4D2D' },
  TOKOPEDIA: { bg: 'bg-green-500', text: 'text-white', hex: '#03AC0E' },
  TIKTOK_SHOP: { bg: 'bg-black', text: 'text-white', hex: '#000000' },
  LAZADA: { bg: 'bg-blue-600', text: 'text-white', hex: '#0F146D' },
  SHOPIFY: { bg: 'bg-emerald-600', text: 'text-white', hex: '#008060' },
  WOOCOMMERCE: { bg: 'bg-purple-600', text: 'text-white', hex: '#96588A' },
} as const;

export const ORDER_STATUS_COLORS = {
  PENDING: 'warning',
  PAID: 'info',
  PACKED: 'info',
  READY_TO_SHIP: 'info',
  SHIPPED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'destructive',
  REFUNDED: 'destructive',
} as const;

export const ORDER_STATUS_LABELS = {
  PENDING: 'Menunggu',
  PAID: 'Dibayar',
  PACKED: 'Dikemas',
  READY_TO_SHIP: 'Siap Kirim',
  SHIPPED: 'Dikirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  RETURNED: 'Dikembalikan',
  REFUNDED: 'Direfund',
} as const;
