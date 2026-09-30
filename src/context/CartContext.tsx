import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, Coupon, DeliveryMethod, Product } from '../types';

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
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  isFreeShipping: boolean;
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
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
    setCart((prev) => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(newQty, product.stock || 100)
        };
        return updated;
      } else {
        return [...prev, {
          product,
          quantity: Math.min(quantity, product.stock || 100)
        }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: Math.min(quantity, item.product.stock || 100)
        };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupons([]);
  };

  const applyCoupon = (coupon: Coupon | null) => {
    if (!coupon) return;
    setAppliedCoupons(prev => {
      const cleanCode = coupon.code.trim().toUpperCase();
      if (prev.some(c => c.code.toUpperCase() === cleanCode)) return prev;
      return [...prev, coupon];
    });
  };

  const removeCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setAppliedCoupons(prev => prev.filter(c => c.code.toUpperCase() !== cleanCode));
  };

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('express');
  const [immediateDispatchFee, setImmediateDispatchFee] = useState(0);

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const isFreeShipping = appliedCoupons.some(c => c.discountType === 'free_shipping');
  const quotedImmediateFee = deliveryMethod === 'immediate' ? Math.max(0, immediateDispatchFee) : 0;
  const shippingFee = cart.length > 0 && !isFreeShipping ? quotedImmediateFee : 0;

  // Calculate sum of item discounts (excluding free_shipping which makes shippingFee = 0)
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

  const discountAmount = Math.min(rawItemDiscount, subtotal);
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
      discountAmount,
      shippingFee,
      totalAmount,
      itemCount,
      isFreeShipping,
      deliveryMethod,
      setDeliveryMethod,
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
