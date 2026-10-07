import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, Coupon, DeliveryMethod, Product } from '../types';
import { EXPRESS_DELIVERY_FEE } from '../constants/deliveryCopy';
import { DEFAULT_DISTRIBUTION_HUB_ID } from '../constants/distributionHubs';
import { getSpendPromoState } from '../constants/spendPromo';
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
  spendPromoDiscount: number;
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

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const isFreeShipping = appliedCoupons.some(c => c.discountType === 'free_shipping');
  const quotedImmediateFee = Math.max(0, immediateDispatchFee);
  const baseShipping = deliveryMethod === 'pickup'
    ? 0
    : deliveryMethod === 'immediate'
      ? quotedImmediateFee
      : EXPRESS_DELIVERY_FEE;
  const waiveImmediate = isFreeShipping && deliveryMethod === 'immediate';
  const shippingFee = cart.length > 0 && !waiveImmediate ? baseShipping : 0;

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

  const spendPromoDiscount = getSpendPromoState(subtotal).discount;
  const couponDiscountAmount = Math.min(rawItemDiscount, subtotal);
  const discountAmount = Math.min(couponDiscountAmount + spendPromoDiscount, subtotal);
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
      spendPromoDiscount,
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
