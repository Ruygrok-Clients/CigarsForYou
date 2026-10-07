import { DEMO_COUPONS } from './coupon';
import type { Coupon, Order } from '../types';

export type OrderCouponSnapshot = {
  code: string;
  discountType: Coupon['discountType'];
};

export type CouponTypeMap = Record<string, Coupon['discountType']>;

export function parseCouponCodes(couponCode?: string | null): string[] {
  if (!couponCode?.trim()) return [];
  return couponCode
    .split(/[,|;]/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

function resolveDiscountType(code: string, typeByCode?: CouponTypeMap): Coupon['discountType'] | undefined {
  return typeByCode?.[code] ?? DEMO_COUPONS[code]?.discountType;
}

/**
 * Split order coupons into product discounts vs delivery (free shipping) offers.
 * Prefers structured `appliedCoupons` on the order when present.
 */
export function partitionOrderCoupons(
  order: Pick<Order, 'couponCode' | 'appliedCoupons'>,
  typeByCode?: CouponTypeMap
): { itemCodes: string[]; shippingCodes: string[] } {
  if (order.appliedCoupons && order.appliedCoupons.length > 0) {
    const itemCodes: string[] = [];
    const shippingCodes: string[] = [];
    for (const entry of order.appliedCoupons) {
      const code = entry.code.trim().toUpperCase();
      if (!code) continue;
      if (entry.discountType === 'free_shipping') shippingCodes.push(code);
      else itemCodes.push(code);
    }
    return { itemCodes, shippingCodes };
  }

  const itemCodes: string[] = [];
  const shippingCodes: string[] = [];
  for (const code of parseCouponCodes(order.couponCode)) {
    if (resolveDiscountType(code, typeByCode) === 'free_shipping') shippingCodes.push(code);
    else itemCodes.push(code);
  }
  return { itemCodes, shippingCodes };
}

/** Shipping-line label when a free-shipping offer actually waived Immediate Dispatch. */
export function shippingOfferCodesForOrder(
  order: Pick<Order, 'couponCode' | 'appliedCoupons' | 'deliveryMethod' | 'shippingFee'>,
  typeByCode?: CouponTypeMap
): string[] {
  const { shippingCodes } = partitionOrderCoupons(order, typeByCode);
  if (shippingCodes.length === 0) return [];
  if (order.deliveryMethod !== 'immediate') return [];
  if ((order.shippingFee ?? 0) > 0) return [];
  return shippingCodes;
}

export function formatCouponCodesLabel(codes: string[]): string {
  return codes.join(', ');
}
