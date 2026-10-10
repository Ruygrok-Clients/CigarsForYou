import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, Coupon, DeliveryMethod, Product } from '../types';
import { EXPRESS_DELIVERY_FEE } from '../constants/deliveryCopy';
import { DEFAULT_DISTRIBUTION_HUB_ID } from '../constants/distributionHubs';
import { getSpendPromoShippingCredit, getSpendPromoState, type SpendPromoRewardMode } from '../constants/spendPromo';
import { couponLabel, trackAddToCart, trackRemoveFromCart, trackSelectPromotion } from '../lib/analytics';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
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

  const addToCart = (product: Product, quantity: number = 1) => {
    // Unit price is frozen at add time (bulk discounts are applied on the product page).
    // Changing quantity in the cart does not re-resolve a bulk tier.
    const requested = Math.max(1, quantity);
    let trackedQty = 0;
    let unitPrice = product.price;
    setCart((prev) => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);

      if (existingIndex > -1) {
        const updated = [...prev];
        const cap = product.stock || 100;
        const newQty = Math.min(updated[existingIndex].quantity + requested, cap);
        trackedQty = newQty - updated[existingIndex].quantity;
        unitPrice = updated[existingIndex].product.price;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty
        };
        return updated;
      }

      trackedQty = Math.min(requested, product.stock || 100);
      unitPrice = product.price;
      return [...prev, {
        product,
        quantity: trackedQty
      }];
    });
    if (trackedQty > 0) {
      trackAddToCart(product, trackedQty, unitPrice, couponLabel(appliedCoupons.map((coupon) => coupon.code)));
    }
  };

  const removeFromCart = (productId: string) => {
    let removed: CartItem | undefined;
    setCart(prev => {
      removed = prev.find(item => item.product.id === productId);
      return prev.filter(item => item.product.id !== productId);
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

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    let delta = 0;
    let changed: CartItem | undefined;
    setCart(prev => prev.map(item => {
      if (item.product.id !== productId) return item;
      const nextQty = Math.min(quantity, item.product.stock || 100);
      delta = nextQty - item.quantity;
      changed = item;
      return {
        ...item,
        quantity: nextQty
      };
    }));
    if (!changed || delta === 0) return;
    const coupon = couponLabel(appliedCoupons.map((entry) => entry.code));
    if (delta > 0) {
      trackAddToCart(changed.product, delta, changed.product.price, coupon);
    } else {
      trackRemoveFromCart(changed.product, Math.abs(delta), changed.product.price, coupon);
    }
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupons([]);
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
