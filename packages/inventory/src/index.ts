/**
 * @omnichannel/inventory
 * Business logic for stock management, calculations, and rules
 * Full implementation in Sprint 3
 */

export interface StockCalculation {
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  incomingStock: number;
}

/**
 * Calculate available stock from components
 */
export function calculateAvailableStock(
  total: number,
  reserved: number,
): number {
  return Math.max(0, total - reserved);
}

/**
 * Check if stock is low based on minimum stock setting
 */
export function isLowStock(available: number, minimumStock: number): boolean {
  return available <= minimumStock;
}

/**
 * Check if stock is out
 */
export function isOutOfStock(available: number): boolean {
  return available <= 0;
}

/**
 * Calculate reserved stock for pending orders
 */
export function calculateReservedStock(pendingQuantities: number[]): number {
  return pendingQuantities.reduce((sum, qty) => sum + qty, 0);
}
