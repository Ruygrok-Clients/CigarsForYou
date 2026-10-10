import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, Coupon, DeliveryMethod, Product } from '../types';
import { EXPRESS_DELIVERY_FEE } from '../constants/deliveryCopy';
import { DEFAULT_DISTRIBUTION_HUB_ID } from '../constants/distributionHubs';
import { getSpendPromoShippingCredit, getSpendPromoState, type SpendPromoRewardMode } from '../constants/spendPromo';
import { resolveCartUnitPrice, stockLimitForProduct } from '../utils/bulkPricing';
import { couponLabel, trackAddToCart, trackRemoveFromCart, trackSelectPromotion } from '../lib/analytics';

function cartItemKey(item: Pick<CartItem, 'product'>): string {
  return item.product.id || item.product.slug;
}

function productKey(product: Product): string {
  return product.id || product.slug;
}

export type CartHoldPhase = 'active' | 'expired' | 'idle';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  /** Optional live catalog product supplies fresh stock, list price, and bulk tiers. */
  updateQuantity: (productId: string, quantity: number, catalogProduct?: Product) => void;
  clearCart: () => void;
  /** Marketing countdown only — does not lock warehouse stock. */
  holdExpiresAt: number | null;
  holdRemainingMs: number;
  holdPhase: CartHoldPhase;
  appliedCoupons: Coupon[];
  appliedCoupon: Coupon | null; // backward compatibility
  applyCoupon: (coupon: Coupon | null) => void;
  removeCoupon: (code: string) => void;
  subtotal: number;
  couponDiscountAmount: number;
  spendPromoUnlocked: boolean;
  spendPromoRewardMode: SpendPromoRewardMode;
  setSpendPromoRewardMode: (mode: SpendPromoRewardMode) => void;
  spendPromoShippingCredit: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  isFreeShipping: boolean;
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  pickupHubId: string;
  setPickupHubId: (hubId: string) => void;
  immediateDispatchFee: number;
  setImmediateDispatchFee: (fee: number) => void;
}

const CART_KEY = 'cfy_cart_items_v1';
const COUPON_KEY = 'cfy_applied_coupons_v2';
const REWARD_MODE_KEY = 'cfy_spend_promo_reward_mode_v1';
const HOLD_KEY = 'cfy_cart_hold_expires_v1';
const HOLD_DURATION_MS = 10 * 60 * 1000;
const HOLD_EXPIRED_VISIBLE_MS = 6000;

function readHoldExpiresAt(): number | null {
  try {
    const raw = localStorage.getItem(HOLD_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function readRewardMode(): SpendPromoRewardMode {
  try {
    return localStorage.getItem(REWARD_MODE_KEY) === 'free_express' ? 'free_express' : 'immediate_credit';
  } catch {
    return 'immediate_credit';
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupons, setAppliedCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem(COUPON_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      if (appliedCoupons.length > 0) {
        localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupons));
      } else {
        localStorage.removeItem(COUPON_KEY);
      }
    } catch (e) {
      console.error('Failed to save coupons to localStorage', e);
    }
  }, [appliedCoupons]);

  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(readHoldExpiresAt);
  const [holdRemainingMs, setHoldRemainingMs] = useState(0);
  const [holdPhase, setHoldPhase] = useState<CartHoldPhase>(() => {
    const expires = readHoldExpiresAt();
    if (expires == null) return 'idle';
    return expires > Date.now() ? 'active' : 'expired';
  });

  const startHold = () => {
    const expires = Date.now() + HOLD_DURATION_MS;
    setHoldExpiresAt(expires);
    setHoldRemainingMs(HOLD_DURATION_MS);
    setHoldPhase('active');
  };

  const clearHold = () => {
    setHoldExpiresAt(null);
    setHoldRemainingMs(0);
    setHoldPhase('idle');
  };

  useEffect(() => {
    if (cart.length === 0) {
      clearHold();
    }
  }, [cart.length]);

  useEffect(() => {
    try {
      if (holdExpiresAt == null) localStorage.removeItem(HOLD_KEY);
      else localStorage.setItem(HOLD_KEY, String(holdExpiresAt));
    } catch (e) {
      console.error('Failed to save cart hold', e);
    }
  }, [holdExpiresAt]);

  useEffect(() => {
    if (holdExpiresAt == null || cart.length === 0) return;

    const update = () => {
      const remaining = holdExpiresAt - Date.now();
      if (remaining <= 0) {
        setHoldRemainingMs(0);
        setHoldPhase('expired');
        return true;
      }
      setHoldRemainingMs(remaining);
      setHoldPhase('active');
      return false;
    };

    if (update()) return;
    const id = window.setInterval(() => {
      if (update()) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [holdExpiresAt, cart.length]);

  useEffect(() => {
    if (holdPhase !== 'expired') return;
    const timer = window.setTimeout(() => {
      setHoldExpiresAt(null);
      setHoldRemainingMs(0);
      setHoldPhase('idle');
    }, HOLD_EXPIRED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [holdPhase]);

  const addToCart = (product: Product, quantity: number = 1) => {
    // `product.price` is the catalogue list unit price. Charged unit price is resolved
    // from bulk tiers (10 / 25+) for tobacco and always capped by stock.
    const requested = Math.max(1, quantity);
    const stockCap = stockLimitForProduct(product);
    let trackedQty = 0;
    let unitPrice = product.price;
    const incomingKey = productKey(product);
    let addedNewLine = false;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => cartItemKey(item) === incomingKey);

      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const listUnitPrice = existing.listUnitPrice ?? product.price;
        const newQty = Math.min(existing.quantity + requested, stockCap);
        trackedQty = newQty - existing.quantity;
        unitPrice = resolveCartUnitPrice(product, listUnitPrice, newQty);
        updated[existingIndex] = {
          ...existing,
          listUnitPrice,
          quantity: newQty,
          product: {
            ...existing.product,
            ...product,
            price: unitPrice,
            stock: stockCap
          }
        };
        return updated;
      }

      trackedQty = Math.min(requested, stockCap);
      if (trackedQty <= 0) return prev;
      addedNewLine = true;
      unitPrice = resolveCartUnitPrice(product, product.price, trackedQty);
      return [...prev, {
        product: {
          ...product,
          price: unitPrice,
          stock: stockCap
        },
        quantity: trackedQty,
        listUnitPrice: product.price
      }];
    });
    if (addedNewLine) startHold();
    if (trackedQty > 0) {
      trackAddToCart(product, trackedQty, unitPrice, couponLabel(appliedCoupons.map((coupon) => coupon.code)));
    }
  };

  const removeFromCart = (productId: string) => {
    let removed: CartItem | undefined;
    setCart((prev) => {
      removed = prev.find((item) => cartItemKey(item) === productId);
      return prev.filter((item) => cartItemKey(item) !== productId);
    });
    if (removed && removed.quantity > 0) {
      trackRemoveFromCart(
        removed.product,
        removed.quantity,
        removed.product.price,
        couponLabel(appliedCoupons.map((coupon) => coupon.code))
      );
    }
  };

  const updateQuantity = (productId: string, quantity: number, catalogProduct?: Product) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    let delta = 0;
    let changed: CartItem | undefined;
    let nextUnitPrice = 0;
    setCart((prev) => prev.map((item) => {
      if (cartItemKey(item) !== productId) return item;

      const mergedProduct: Product = catalogProduct
        ? {
            ...item.product,
            ...catalogProduct,
            // Keep cart line identity stable.
            id: item.product.id || catalogProduct.id,
            slug: item.product.slug || catalogProduct.slug
          }
        : item.product;

      const listUnitPrice = catalogProduct?.price ?? item.listUnitPrice ?? item.product.price;
      const stockCap = stockLimitForProduct(mergedProduct);
      const nextQty = Math.min(quantity, stockCap);
      const unitPrice = resolveCartUnitPrice(mergedProduct, listUnitPrice, nextQty);

      delta = nextQty - item.quantity;
      changed = item;
      nextUnitPrice = unitPrice;

      return {
        ...item,
        listUnitPrice,
        quantity: nextQty,
        product: {
          ...mergedProduct,
          price: unitPrice,
          stock: stockCap
        }
      };
    }));
    if (!changed || delta === 0) return;
    const coupon = couponLabel(appliedCoupons.map((entry) => entry.code));
    if (delta > 0) {
      trackAddToCart(changed.product, delta, nextUnitPrice, coupon);
    } else {
      trackRemoveFromCart(changed.product, Math.abs(delta), nextUnitPrice, coupon);
    }
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupons([]);
    clearHold();
  };

  const applyCoupon = (coupon: Coupon | null) => {
    if (!coupon) return;
    const cleanCode = coupon.code.trim().toUpperCase();
    let added = false;
    setAppliedCoupons(prev => {
      if (prev.some(c => c.code.toUpperCase() === cleanCode)) return prev;
      added = true;
      return [...prev, coupon];
    });
    if (added) trackSelectPromotion(cleanCode, cleanCode, 'coupon_apply');
  };

  const removeCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    let removed = false;
    setAppliedCoupons(prev => {
      const next = prev.filter(c => c.code.toUpperCase() !== cleanCode);
      removed = next.length !== prev.length;
      return next;
    });
    if (removed) trackSelectPromotion(cleanCode, cleanCode, 'coupon_remove');
  };

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [pickupHubId, setPickupHubId] = useState(DEFAULT_DISTRIBUTION_HUB_ID);
  const [immediateDispatchFee, setImmediateDispatchFee] = useState(0);
  const [spendPromoRewardMode, setSpendPromoRewardModeState] = useState<SpendPromoRewardMode>(readRewardMode);
  const wasSpendPromoUnlocked = React.useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(REWARD_MODE_KEY, spendPromoRewardMode);
    } catch (e) {
      console.error('Failed to save spend promo reward mode', e);
    }
  }, [spendPromoRewardMode]);

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const spendPromoUnlocked = getSpendPromoState(subtotal).unlocked;

  const deliveryMethodForRewardMode = (mode: SpendPromoRewardMode): DeliveryMethod =>
    mode === 'free_express' ? 'express' : 'immediate';

  const setSpendPromoRewardMode = (mode: SpendPromoRewardMode) => {
    setSpendPromoRewardModeState(mode);
    if (getSpendPromoState(subtotal).unlocked) {
      setDeliveryMethod(deliveryMethodForRewardMode(mode));
    }
  };

  useEffect(() => {
    if (spendPromoUnlocked && !wasSpendPromoUnlocked.current) {
      setDeliveryMethod(deliveryMethodForRewardMode(spendPromoRewardMode));
    }
    wasSpendPromoUnlocked.current = spendPromoUnlocked;
  }, [spendPromoUnlocked, spendPromoRewardMode]);

  const isFreeShipping = appliedCoupons.some(c => c.discountType === 'free_shipping');
  const quotedImmediateFee = Math.max(0, immediateDispatchFee);
  const baseShipping = deliveryMethod === 'pickup'
    ? 0
    : deliveryMethod === 'immediate'
      ? quotedImmediateFee
      : EXPRESS_DELIVERY_FEE;
  const waiveImmediate = isFreeShipping && deliveryMethod === 'immediate';
  const rawSpendCredit = getSpendPromoShippingCredit({
    unlocked: spendPromoUnlocked,
    rewardMode: spendPromoRewardMode,
    deliveryMethod,
    baseShipping
  });
  const spendPromoShippingCredit = waiveImmediate ? 0 : rawSpendCredit;
  const shippingFee = cart.length === 0 || waiveImmediate
    ? 0
    : Math.max(0, baseShipping - spendPromoShippingCredit);

  // Item discounts only. free_shipping waives Immediate Dispatch, not Express.
  let rawItemDiscount = 0;
  for (const c of appliedCoupons) {
    if (!c.active && c.active !== undefined) continue;
    if (c.discountType === 'free_shipping') continue;

    const minRequired = c.minSpend ?? c.minOrderAmount ?? 0;
    if (subtotal >= minRequired) {
      if (c.discountType === 'percentage') {
        rawItemDiscount += (subtotal * c.amount) / 100;
      } else if (c.discountType === 'fixed') {
        rawItemDiscount += c.amount;
      }
    }
  }

  const couponDiscountAmount = Math.min(rawItemDiscount, subtotal);
  const discountAmount = couponDiscountAmount;
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      holdExpiresAt,
      holdRemainingMs,
      holdPhase,
      appliedCoupons,
      appliedCoupon: appliedCoupons[0] || null,
      applyCoupon,
      removeCoupon,
      subtotal,
      couponDiscountAmount,
      spendPromoUnlocked,
      spendPromoRewardMode,
      setSpendPromoRewardMode,
      spendPromoShippingCredit,
      discountAmount,
      shippingFee,
      totalAmount,
      itemCount,
      isFreeShipping,
      deliveryMethod,
      setDeliveryMethod,
      pickupHubId,
      setPickupHubId,
      immediateDispatchFee,
      setImmediateDispatchFee
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
