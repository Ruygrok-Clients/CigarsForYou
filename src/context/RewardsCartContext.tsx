import React, { createContext, useContext, useEffect, useState } from 'react';
import type { DeliveryMethod, RewardCartItem, RewardCheckoutDraft, RewardProduct } from '../types';

interface RewardsCartContextType {
  items: RewardCartItem[];
  pointsTotal: number;
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  immediateDispatchFee: number;
  setImmediateDispatchFee: (fee: number) => void;
  shippingFee: number;
  checkoutDraft: RewardCheckoutDraft | null;
  setCheckoutDraft: (draft: RewardCheckoutDraft | null) => void;
  addItem: (product: RewardProduct, quantity: number, spendablePoints: number) => boolean;
  updateQuantity: (productId: string, quantity: number, spendablePoints: number) => boolean;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = 'cfy_rewards_cart_v1';

const RewardsCartContext = createContext<RewardsCartContextType | undefined>(undefined);

function pointsFor(items: RewardCartItem[]): number {
  return items.reduce((sum, item) => sum + item.product.pointsCost * item.quantity, 0);
}

function readStoredCart(): {
  items: RewardCartItem[];
  deliveryMethod: DeliveryMethod;
  immediateDispatchFee: number;
  checkoutDraft: RewardCheckoutDraft | null;
} {
  const empty = {
    items: [] as RewardCartItem[],
    deliveryMethod: 'express' as DeliveryMethod,
    immediateDispatchFee: 0,
    checkoutDraft: null
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return empty;
    const parsed = JSON.parse(saved);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      deliveryMethod: parsed.deliveryMethod === 'immediate' ? 'immediate' : 'express',
      immediateDispatchFee: Number(parsed.immediateDispatchFee) || 0,
      checkoutDraft: parsed.checkoutDraft ?? null
    };
  } catch {
    return empty;
  }
}

export const RewardsCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stored] = useState(readStoredCart);
  const [items, setItems] = useState<RewardCartItem[]>(stored.items);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(stored.deliveryMethod);
  const [immediateDispatchFee, setImmediateDispatchFee] = useState(stored.immediateDispatchFee);
  const [checkoutDraft, setCheckoutDraft] = useState<RewardCheckoutDraft | null>(stored.checkoutDraft);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        items,
        deliveryMethod,
        immediateDispatchFee,
        checkoutDraft
      }));
    } catch (err) {
      console.error('Failed to save rewards cart', err);
    }
  }, [items, deliveryMethod, immediateDispatchFee, checkoutDraft]);

  const addItem = (product: RewardProduct, quantity: number, spendable: number) => {
    if (!product.id || quantity <= 0) return false;
    const existing = items.find((item) => item.product.id === product.id);
    const nextQty = Math.min((existing?.quantity || 0) + quantity, product.stock);
    if (nextQty <= 0) return false;
    const next = [
      ...items.filter((item) => item.product.id !== product.id),
      { product, quantity: nextQty }
    ];
    if (pointsFor(next) > spendable) return false;
    setItems(next);
    return true;
  };

  const updateQuantity = (productId: string, quantity: number, spendable: number) => {
    if (quantity <= 0) {
      setItems(items.filter((item) => item.product.id !== productId));
      return true;
    }
    const next = items.map((item) => {
      if (item.product.id !== productId) return item;
      return { ...item, quantity: Math.min(quantity, item.product.stock) };
    });
    if (pointsFor(next) > spendable) return false;
    setItems(next);
    return true;
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
    setCheckoutDraft(null);
  };

  const shippingFee = deliveryMethod === 'immediate' ? immediateDispatchFee : 0;

  return (
    <RewardsCartContext.Provider value={{
      items,
      pointsTotal: pointsFor(items),
      deliveryMethod,
      setDeliveryMethod,
      immediateDispatchFee,
      setImmediateDispatchFee,
      shippingFee,
      checkoutDraft,
      setCheckoutDraft,
      addItem,
      updateQuantity,
      removeItem,
      clearCart
    }}>
      {children}
    </RewardsCartContext.Provider>
  );
};

// Hook shares the provider file so cart state stays next to the component that owns it.
// eslint-disable-next-line react-refresh/only-export-components
export function useRewardsCart() {
  const context = useContext(RewardsCartContext);
  if (!context) {
    throw new Error('useRewardsCart must be used within a RewardsCartProvider');
  }
  return context;
}
