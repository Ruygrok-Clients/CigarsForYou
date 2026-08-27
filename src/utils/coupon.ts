import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Coupon } from '../types';

export const DEMO_COUPONS: Record<string, Coupon> = {
  WELCOME10: {
    code: 'WELCOME10',
    discountType: 'percentage',
    amount: 10,
    active: true,
    timesClaimed: 12,
    minSpend: 0
  },
  CUBAN50: {
    code: 'CUBAN50',
    discountType: 'fixed',
    amount: 50,
    active: true,
    timesClaimed: 4,
    minSpend: 200
  },
  FREESHIP: {
    code: 'FREESHIP',
    discountType: 'free_shipping',
    amount: 25,
    active: true,
    timesClaimed: 8,
    minSpend: 0
  }
};

export interface CouponValidationResult {
  success: boolean;
  coupon?: Coupon;
  error?: string;
}

/**
 * Validates a coupon code against Firestore database with fallback to built-in demo coupons.
 * Enforces active status, minimum spend, expiration date, and redemption limits.
 */
export async function validateAndFetchCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    return { success: false, error: 'Please enter a coupon code.' };
  }

  let coupon: Coupon | null = null;

  try {
    const couponRef = doc(db, 'coupons', cleanCode);
    const couponSnap = await getDoc(couponRef);

    if (couponSnap.exists()) {
      coupon = { code: couponSnap.id, ...couponSnap.data() } as Coupon;
    }
  } catch (err) {
    console.warn(`Firestore coupon fetch failed for "${cleanCode}", checking demo coupons fallback:`, err);
  }

  // Fallback to demo coupons if not found in Firestore
  if (!coupon && DEMO_COUPONS[cleanCode]) {
    coupon = DEMO_COUPONS[cleanCode];
  }

  if (!coupon) {
    return {
      success: false,
      error: `Invalid coupon code "${cleanCode}". Try WELCOME10 or CUBAN50.`
    };
  }

  // Check active status
  if (coupon.active === false) {
    return {
      success: false,
      error: `Coupon code "${cleanCode}" is no longer active.`
    };
  }

  // Check expiration date
  if (coupon.expiresAt) {
    const expireDate = new Date(coupon.expiresAt);
    if (!isNaN(expireDate.getTime()) && expireDate < new Date()) {
      return {
        success: false,
        error: `Coupon code "${cleanCode}" expired on ${expireDate.toLocaleDateString('en-AU')}.`
      };
    }
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usageLimit > 0) {
    const currentUsage = coupon.usedCount ?? coupon.timesClaimed ?? 0;
    if (currentUsage >= coupon.usageLimit) {
      return {
        success: false,
        error: `Coupon code "${cleanCode}" has reached its maximum redemptions.`
      };
    }
  }

  // Check minimum spend requirement
  const minRequired = coupon.minSpend ?? coupon.minOrderAmount ?? 0;
  if (minRequired > 0 && subtotal < minRequired) {
    const amountNeeded = (minRequired - subtotal).toFixed(2);
    return {
      success: false,
      error: `Coupon "${cleanCode}" requires a minimum spend of $${minRequired}.00 AUD. Add $${amountNeeded} AUD more to qualify.`
    };
  }

  return {
    success: true,
    coupon
  };
}
