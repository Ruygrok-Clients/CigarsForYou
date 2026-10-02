import type { OrderSource } from '../types';

/** Points from merchandise spend after coupons and before shipping. */
export function pointsEarnedForSpend(subtotal: number, discountAmount: number): number {
  const net = Math.max(0, Number(subtotal) - Number(discountAmount));
  if (!Number.isFinite(net)) return 0;
  return Math.floor(net);
}

/** Shop can only spend a non-negative balance. Stored balance may be negative after clawback. */
export function spendablePoints(balance: number | undefined | null): number {
  const value = Number(balance ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function orderSourceLabel(source: OrderSource | string): string {
  if (source === 'Reward') return 'Reward Order';
  return source;
}
