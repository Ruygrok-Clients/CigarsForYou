import type { LoyaltyTier, OrderSource, RewardProduct, RewardsLedgerEntry, TierPointsCost } from '../types';

export const LOYALTY_TIERS: LoyaltyTier[] = ['bronze', 'silver', 'gold'];
export const DEFAULT_SILVER_THRESHOLD = 350;
export const DEFAULT_GOLD_THRESHOLD = 750;
export const LOYALTY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeLoyaltyTier(value: unknown): LoyaltyTier {
  if (value === 'bronze' || value === 'silver' || value === 'gold') return value;
  return 'bronze';
}

export function tierRank(tier: LoyaltyTier): number {
  return LOYALTY_TIERS.indexOf(normalizeLoyaltyTier(tier));
}

export function tierLabel(tier: LoyaltyTier): string {
  const normalized = normalizeLoyaltyTier(tier);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** Banner / avatar background colours for each loyalty tier */
export const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: '#6B3F24',
  silver: '#5E6770',
  gold: '#8A6A12'
};

export function suggestedLoyaltyTier(
  windowPoints: number,
  silverThreshold: number,
  goldThreshold: number
): LoyaltyTier {
  const points = Math.max(0, Math.floor(Number(windowPoints) || 0));
  const silver = Math.max(1, Math.floor(Number(silverThreshold) || DEFAULT_SILVER_THRESHOLD));
  const gold = Math.max(silver + 1, Math.floor(Number(goldThreshold) || DEFAULT_GOLD_THRESHOLD));
  if (points >= gold) return 'gold';
  if (points >= silver) return 'silver';
  return 'bronze';
}

/** Jump up any number of tiers. Drop exactly one tier when below the current tier's threshold. */
export function applyLoyaltyTierTransition(current: LoyaltyTier, suggested: LoyaltyTier): LoyaltyTier {
  const currentRank = tierRank(current);
  const suggestedRank = tierRank(suggested);
  if (suggestedRank > currentRank) return suggested;
  if (suggestedRank < currentRank) return LOYALTY_TIERS[currentRank - 1];
  return normalizeLoyaltyTier(current);
}

function positiveCost(value: unknown, fallback: number): number {
  const next = Math.floor(Number(value));
  if (!Number.isFinite(next) || next < 1) return fallback;
  return next;
}

export function resolvePointsCostByTier(product: Pick<RewardProduct, 'pointsCost' | 'pointsCostByTier'>): TierPointsCost {
  const legacy = positiveCost(product.pointsCost, 1);
  const raw = product.pointsCostByTier || {};
  const bronze = positiveCost(raw.bronze, legacy);
  const silver = positiveCost(raw.silver, bronze);
  const gold = positiveCost(raw.gold, silver);
  return { bronze, silver, gold };
}

export function resolveMinTier(product: Pick<RewardProduct, 'minTier'>): LoyaltyTier {
  return normalizeLoyaltyTier(product.minTier);
}

export function resolveProductPointsCost(
  product: Pick<RewardProduct, 'pointsCost' | 'pointsCostByTier'>,
  tier: LoyaltyTier | undefined | null
): number {
  return resolvePointsCostByTier(product)[normalizeLoyaltyTier(tier)];
}

export function productVisibleForTier(
  product: Pick<RewardProduct, 'minTier'>,
  tier: LoyaltyTier | undefined | null
): boolean {
  return tierRank(resolveMinTier(product)) <= tierRank(normalizeLoyaltyTier(tier));
}

/** Net purchase earns in the window. A clawback for the same order removes that earn. Redeems are ignored. */
export function rollingEarnPoints(
  entries: Array<Pick<RewardsLedgerEntry, 'reason' | 'delta' | 'orderId' | 'createdAt'>>,
  nowMs: number = Date.now()
): number {
  const cutoff = new Date(nowMs - LOYALTY_WINDOW_MS).toISOString();
  const inWindow = entries.filter((entry) => typeof entry.createdAt === 'string' && entry.createdAt >= cutoff);
  const clawedOrders = new Set<string>();
  for (const entry of inWindow) {
    if (entry.reason === 'clawback' && entry.orderId) clawedOrders.add(entry.orderId);
  }
  let total = 0;
  for (const entry of inWindow) {
    if (entry.reason !== 'earn') continue;
    if (entry.orderId && clawedOrders.has(entry.orderId)) continue;
    const delta = Number(entry.delta) || 0;
    if (delta > 0) total += delta;
  }
  return Math.floor(total);
}

export function loyaltyStatusLines(
  tier: LoyaltyTier,
  windowPoints: number,
  silverThreshold: number,
  goldThreshold: number
): string[] {
  const current = normalizeLoyaltyTier(tier);
  const points = Math.max(0, Math.floor(Number(windowPoints) || 0));
  const silver = Math.max(1, Math.floor(silverThreshold) || DEFAULT_SILVER_THRESHOLD);
  const gold = Math.max(silver + 1, Math.floor(goldThreshold) || DEFAULT_GOLD_THRESHOLD);
  const next = applyLoyaltyTierTransition(current, suggestedLoyaltyTier(points, silver, gold));
  const lines = [`${points} points earned in the last 30 days.`];
  if (next !== current) {
    lines.push(`On the next check you move to ${tierLabel(next)}. You can jump up more than one tier, and you only drop one tier at a time.`);
    return lines;
  }
  if (current === 'bronze') {
    lines.push(`Silver starts at ${silver} points in 30 days. Gold starts at ${gold}. You can jump straight to Gold.`);
  } else if (current === 'silver') {
    lines.push(`Stay at or above ${silver} points in any 30 days to keep Silver. ${gold} moves you to Gold. Below ${silver}, you move to Bronze.`);
  } else {
    lines.push(`Stay at or above ${gold} points in any 30 days to keep Gold. Below that, you move to Silver.`);
  }
  return lines;
}

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

const TIER_SNAPSHOT_KEY = 'cfy_loyalty_tier_before_order';

export function rememberLoyaltyTier(tier: LoyaltyTier): void {
  try {
    sessionStorage.setItem(TIER_SNAPSHOT_KEY, normalizeLoyaltyTier(tier));
  } catch {
    // Ignore private-mode storage failures. The confirmation page simply skips the celebration.
  }
}

export function readLoyaltyTierSnapshot(): LoyaltyTier | null {
  try {
    const value = sessionStorage.getItem(TIER_SNAPSHOT_KEY);
    if (value === 'bronze' || value === 'silver' || value === 'gold') return value;
    return null;
  } catch {
    return null;
  }
}

export function clearLoyaltyTierSnapshot(): void {
  try {
    sessionStorage.removeItem(TIER_SNAPSHOT_KEY);
  } catch {
    // Ignore private-mode storage failures.
  }
}
