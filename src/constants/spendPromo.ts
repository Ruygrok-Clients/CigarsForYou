import type { DeliveryMethod } from '../types';

/** Automatic cart promo: spend threshold unlocks VIP dispatch perks. */
export const SPEND_PROMO_THRESHOLD = 350;
export const SPEND_PROMO_IMMEDIATE_CREDIT = 50;

export type SpendPromoRewardMode = 'immediate_credit' | 'free_express';

export function getSpendPromoState(subtotal: number) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const remaining = Math.max(0, SPEND_PROMO_THRESHOLD - safeSubtotal);
  const progress = Math.min(100, (safeSubtotal / SPEND_PROMO_THRESHOLD) * 100);
  const unlocked = safeSubtotal >= SPEND_PROMO_THRESHOLD;

  return {
    threshold: SPEND_PROMO_THRESHOLD,
    remaining,
    progress,
    unlocked
  };
}

export function getSpendPromoShippingCredit(input: {
  unlocked: boolean;
  rewardMode: SpendPromoRewardMode;
  deliveryMethod: DeliveryMethod;
  baseShipping: number;
}) {
  if (!input.unlocked) return 0;
  const base = Math.max(0, Number(input.baseShipping) || 0);
  if (base <= 0) return 0;

  if (input.rewardMode === 'immediate_credit' && input.deliveryMethod === 'immediate') {
    return Math.min(SPEND_PROMO_IMMEDIATE_CREDIT, base);
  }

  if (input.rewardMode === 'free_express' && input.deliveryMethod === 'express') {
    return base;
  }

  return 0;
}
