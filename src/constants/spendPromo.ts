/** Automatic cart promo: spend threshold unlocks a fixed order discount. */
export const SPEND_PROMO_THRESHOLD = 400;
export const SPEND_PROMO_DISCOUNT = 50;

export function getSpendPromoState(subtotal: number) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const remaining = Math.max(0, SPEND_PROMO_THRESHOLD - safeSubtotal);
  const progress = Math.min(100, (safeSubtotal / SPEND_PROMO_THRESHOLD) * 100);
  const unlocked = safeSubtotal >= SPEND_PROMO_THRESHOLD;
  const discount = unlocked ? SPEND_PROMO_DISCOUNT : 0;

  return {
    threshold: SPEND_PROMO_THRESHOLD,
    reward: SPEND_PROMO_DISCOUNT,
    remaining,
    progress,
    unlocked,
    discount
  };
}
