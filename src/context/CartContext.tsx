import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, Coupon, Product } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, isSubscription?: boolean, frequencyWeeks?: 2 | 4 | 6 | 8) => void;
  removeFromCart: (productId: string, isSubscription?: boolean, frequencyWeeks?: number) => void;
  updateQuantity: (productId: string, quantity: number, isSubscription?: boolean, frequencyWeeks?: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (coupon: Coupon | null) => void;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  itemCount: number;
}

const CART_KEY = 'cfy_cart_items_v1';

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

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const addToCart = (
    product: Product, 
    quantity: number = 1, 
    isSubscription: boolean = false, 
    frequencyWeeks: 2 | 4 | 6 | 8 = 4
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        !!item.isSubscription === !!isSubscription &&
        (isSubscription ? item.frequencyWeeks === frequencyWeeks : true)
      );

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
          quantity: Math.min(quantity, product.stock || 100),
          isSubscription,
          frequencyWeeks: isSubscription ? frequencyWeeks : undefined
        }];
      }
    });
  };

  const removeFromCart = (productId: string, isSubscription?: boolean, frequencyWeeks?: number) => {
    setCart(prev => prev.filter(item => 
      !(item.product.id === productId && 
        !!item.isSubscription === !!isSubscription && 
        (isSubscription ? item.frequencyWeeks === frequencyWeeks : true))
    ));
  };

  const updateQuantity = (productId: string, quantity: number, isSubscription?: boolean, frequencyWeeks?: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, isSubscription, frequencyWeeks);
      return;
    }

    setCart(prev => prev.map(item => {
      if (
        item.product.id === productId && 
        !!item.isSubscription === !!isSubscription &&
        (isSubscription ? item.frequencyWeeks === frequencyWeeks : true)
      ) {
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
    setAppliedCoupon(null);
  };

  const applyCoupon = (coupon: Coupon | null) => {
    setAppliedCoupon(coupon);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  let discountAmount = 0;
  if (appliedCoupon && appliedCoupon.active) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.amount) / 100;
    } else {
      discountAmount = appliedCoupon.amount;
    }
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const totalAmount = Math.max(0, subtotal - discountAmount);
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      appliedCoupon,
      applyCoupon,
      subtotal,
      discountAmount,
      totalAmount,
      itemCount
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
