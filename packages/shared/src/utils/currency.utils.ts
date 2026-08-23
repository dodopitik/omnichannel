/**
 * Format number as Indonesian Rupiah
 */
export function formatRupiah(amount: number | string | null): string {
  if (amount === null || amount === undefined) return 'Rp 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format compact number (e.g., 1.2K, 3.4M)
 */
export function formatCompact(num: number): string {
  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(num);
}

/**
 * Calculate profit margin percentage
 */
export function calculateMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}
