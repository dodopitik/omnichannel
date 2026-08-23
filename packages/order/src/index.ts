/**
 * @omnichannel/order
 * Order domain logic, status machines, and calculations
 * Full implementation in Sprint 4
 */

export type OrderStatus =
  | 'PENDING' | 'PAID' | 'PACKED' | 'READY_TO_SHIP'
  | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'REFUNDED';

/** Valid next statuses from current status */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:       ['PAID', 'CANCELLED'],
  PAID:          ['PACKED', 'CANCELLED'],
  PACKED:        ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED'],
  SHIPPED:       ['COMPLETED', 'RETURNED'],
  COMPLETED:     ['RETURNED', 'REFUNDED'],
  CANCELLED:     [],
  RETURNED:      ['REFUNDED'],
  REFUNDED:      [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function calculateOrderProfit(
  items: Array<{ unitPrice: number; costPrice: number; quantity: number }>,
  shippingFee: number,
): number {
  const revenue = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const cost = items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);
  return revenue - cost - shippingFee;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:       'Menunggu',
  PAID:          'Dibayar',
  PACKED:        'Dikemas',
  READY_TO_SHIP: 'Siap Kirim',
  SHIPPED:       'Dikirim',
  COMPLETED:     'Selesai',
  CANCELLED:     'Dibatalkan',
  RETURNED:      'Dikembalikan',
  REFUNDED:      'Direfund',
};
