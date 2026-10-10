import type { BulkDiscountTier, Product, ProductRange } from '../types';

export const DEFAULT_BULK_DISCOUNT_TIERS: BulkDiscountTier[] = [
  { id: 'qty1', minQuantity: 1, unitPriceMultiplier: 1 },
  { id: 'qty10', minQuantity: 10, unitPriceMultiplier: 0.95 },
  { id: 'qty25', minQuantity: 25, unitPriceMultiplier: 0.93 }
];

/** Cigars, cigarettes, and legacy docs with no category. Accessories are excluded. */
export function isTobaccoRange(category: ProductRange | undefined | null): boolean {
  return !category || category === 'cigars' || category === 'cigarettes';
}

export function getBulkTiers(product: Pick<Product, 'category' | 'bulkDiscountTiers'>): BulkDiscountTier[] {
  if (!isTobaccoRange(product.category)) return [];
  const stored = product.bulkDiscountTiers;
  if (stored && stored.length > 0) {
    return [...stored].sort((a, b) => a.minQuantity - b.minQuantity);
  }
  return DEFAULT_BULK_DISCOUNT_TIERS;
}

export function resolveTier(tiers: BulkDiscountTier[], quantity: number): BulkDiscountTier | null {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  let match = sorted[0];
  for (const tier of sorted) {
    if (quantity >= tier.minQuantity) match = tier;
  }
  return match;
}

export function unitPriceForTier(basePrice: number, tier: BulkDiscountTier | null): number {
  const raw = tier ? basePrice * tier.unitPriceMultiplier : basePrice;
  return Math.round(raw * 100) / 100;
}

/** Catalogue list price → charged unit price for a cart quantity (bulk tiers for tobacco). */
export function resolveCartUnitPrice(
  product: Pick<Product, 'category' | 'bulkDiscountTiers'>,
  listUnitPrice: number,
  quantity: number
): number {
  const base = Math.round(Math.max(0, listUnitPrice) * 100) / 100;
  if (!isTobaccoRange(product.category)) return base;
  return unitPriceForTier(base, resolveTier(getBulkTiers(product), quantity));
}

export function stockLimitForProduct(product: Pick<Product, 'stock'>): number {
  const stock = Math.floor(Number(product.stock));
  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}

export function savingsPercent(tier: BulkDiscountTier): number {
  return Math.round((1 - tier.unitPriceMultiplier) * 100);
}

export function savingsAmount(basePrice: number, unitPrice: number, quantity: number): number {
  return Math.max(0, (basePrice - unitPrice) * quantity);
}

export function percentToMultiplier(percentOff: number): number {
  const clamped = Math.min(100, Math.max(0, percentOff));
  return Number((1 - clamped / 100).toFixed(4));
}
