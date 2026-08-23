/**
 * @omnichannel/notification
 * Notification templates and event types
 * Full implementation in Sprint 5
 */

export type NotificationEvent =
  | 'order.new'
  | 'order.status_changed'
  | 'stock.low'
  | 'stock.out'
  | 'marketplace.token_expired'
  | 'marketplace.sync_failed'
  | 'marketplace.connected'
  | 'user.login'
  | 'system.error';

export interface NotificationPayload {
  event: NotificationEvent;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
}

/** Build notification payload from event */
export function buildNotification(
  event: NotificationEvent,
  context: Record<string, string | number>,
): NotificationPayload {
  const templates: Record<NotificationEvent, { title: string; message: string }> = {
    'order.new': {
      title: 'Order Baru',
      message: `Order #${context.orderNumber} dari ${context.marketplace}`,
    },
    'order.status_changed': {
      title: 'Status Order Berubah',
      message: `Order #${context.orderNumber} → ${context.status}`,
    },
    'stock.low': {
      title: '⚠️ Stok Hampir Habis',
      message: `${context.productName} tersisa ${context.stock} item di ${context.warehouse}`,
    },
    'stock.out': {
      title: '🚨 Stok Habis',
      message: `${context.productName} sudah habis di ${context.warehouse}`,
    },
    'marketplace.token_expired': {
      title: 'Token Marketplace Kedaluwarsa',
      message: `Token ${context.marketplace} perlu diperbarui`,
    },
    'marketplace.sync_failed': {
      title: 'Sinkronisasi Gagal',
      message: `Sinkronisasi ${context.type} di ${context.marketplace} gagal`,
    },
    'marketplace.connected': {
      title: 'Marketplace Terhubung',
      message: `${context.marketplace} berhasil terhubung`,
    },
    'user.login': {
      title: 'Login Baru',
      message: `Login dari ${context.ip} (${context.device})`,
    },
    'system.error': {
      title: 'System Error',
      message: `Error: ${context.message}`,
    },
  };

  const tpl = templates[event];
  return { event, title: tpl.title, message: tpl.message, data: context as Record<string, unknown> };
}
