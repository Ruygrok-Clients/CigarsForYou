import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import type { Product } from '../types';

const STORAGE_KEY = 'cfy_stock_notify_product_ids_v1';

type ProductRef = Pick<Product, 'id' | 'slug'>;

interface StockNotifyContextType {
  isWatching: (product: ProductRef | null | undefined) => boolean;
  markWatching: (product: ProductRef) => void;
  unmarkWatching: (productIdOrSlug: string) => void;
}

const StockNotifyContext = createContext<StockNotifyContextType | undefined>(undefined);

function readStoredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

function writeStoredIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore private-mode / quota failures
  }
}

export function productNotifyKeys(product: ProductRef): string[] {
  const keys: string[] = [];
  if (product.id) keys.push(product.id);
  if (product.slug && product.slug !== product.id) keys.push(product.slug);
  return keys;
}

export const StockNotifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [watchedIds, setWatchedIds] = useState<Set<string>>(() => readStoredIds());

  const markWatching = useCallback((product: ProductRef) => {
    const keys = productNotifyKeys(product);
    if (keys.length === 0) return;
    setWatchedIds((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => next.add(key));
      writeStoredIds(next);
      return next;
    });
  }, []);

  const unmarkWatching = useCallback((productIdOrSlug: string) => {
    if (!productIdOrSlug) return;
    setWatchedIds((prev) => {
      const next = new Set(prev);
      next.delete(productIdOrSlug);
      writeStoredIds(next);
      return next;
    });
  }, []);

  const isWatching = useCallback((product: ProductRef | null | undefined) => {
    if (!product) return false;
    return productNotifyKeys(product).some((key) => watchedIds.has(key));
  }, [watchedIds]);

  // Merge pending Firestore requests for signed-in users (covers prior sessions / other devices).
  useEffect(() => {
    if (authLoading || !currentUser) return;

    let cancelled = false;

    const syncFromFirestore = async () => {
      const productIds = new Set<string>();

      const emailsToQuery = new Set<string>();
      if (currentUser.email) {
        emailsToQuery.add(currentUser.email.trim());
        emailsToQuery.add(currentUser.email.trim().toLowerCase());
      }
      if (userProfile?.email) {
        emailsToQuery.add(userProfile.email.trim());
        emailsToQuery.add(userProfile.email.trim().toLowerCase());
      }

      for (const em of Array.from(emailsToQuery)) {
        if (!em) continue;
        try {
          const snap = await getDocs(query(collection(db, 'stockNotifications'), where('email', '==', em)));
          snap.forEach((d) => {
            const data = d.data();
            if (data.notified === true) return;
            if (typeof data.productId === 'string' && data.productId) productIds.add(data.productId);
          });
        } catch (err) {
          console.warn(`Stock notify sync for email ${em} failed:`, err);
        }
      }

      if (currentUser.uid) {
        for (const field of ['userId', 'customerId'] as const) {
          try {
            const snap = await getDocs(
              query(collection(db, 'stockNotifications'), where(field, '==', currentUser.uid))
            );
            snap.forEach((d) => {
              const data = d.data();
              if (data.notified === true) return;
              if (typeof data.productId === 'string' && data.productId) productIds.add(data.productId);
            });
          } catch (err) {
            console.warn(`Stock notify sync for ${field} failed:`, err);
          }
        }
      }

      if (cancelled || productIds.size === 0) return;

      setWatchedIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        productIds.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        });
        if (!changed) return prev;
        writeStoredIds(next);
        return next;
      });
    };

    void syncFromFirestore();
    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser, currentUser?.email, currentUser?.uid, userProfile?.email]);

  return (
    <StockNotifyContext.Provider value={{ isWatching, markWatching, unmarkWatching }}>
      {children}
    </StockNotifyContext.Provider>
  );
};

export const useStockNotify = () => {
  const context = useContext(StockNotifyContext);
  if (!context) {
    throw new Error('useStockNotify must be used within a StockNotifyProvider');
  }
  return context;
};
