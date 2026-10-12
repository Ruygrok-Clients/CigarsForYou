import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

const HEARTBEAT_MS = 30_000;
const STALE_MS = 90_000;
const SESSION_KEY = 'cfy-viewer-session';

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function countLiveSessions(snap: QuerySnapshot, sessionId: string): number {
  const now = Date.now();
  let count = 0;
  snap.forEach((sessionDoc) => {
    const lastSeen = sessionDoc.data().lastSeen;
    const seenAt = typeof lastSeen?.toMillis === 'function' ? lastSeen.toMillis() : null;
    if (typeof seenAt !== 'number') {
      if (sessionDoc.id === sessionId) count += 1;
      return;
    }
    if (now - seenAt < STALE_MS) count += 1;
  });
  return count;
}

function allocatedForProduct(
  products: unknown,
  productId: string,
): number {
  if (!products || typeof products !== 'object') return 0;
  const value = (products as Record<string, unknown>)[productId];
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/**
 * Product-page viewer count: server-allocated generated viewers for this
 * product, plus real presence sessions. Clients do not invent a local fake.
 */
export function useProductViewers(productId: string | undefined): number | null {
  const [displayCount, setDisplayCount] = useState<number | null>(null);

  useEffect(() => {
    if (!productId) {
      setDisplayCount(null);
      return;
    }

    const sessionId = getOrCreateSessionId();
    const sessionRef = doc(db, 'productPresence', productId, 'sessions', sessionId);
    const sessionsRef = collection(db, 'productPresence', productId, 'sessions');
    const liveViewersRef = doc(db, 'social_proof_live', 'site_viewers');

    let latestSnap: QuerySnapshot | null = null;
    let allocated = 0;
    let allocationReady = false;
    let present = true;
    let cancelled = false;

    const apply = () => {
      if (cancelled || !allocationReady || !latestSnap) return;
      const liveCount = countLiveSessions(latestSnap, sessionId);
      setDisplayCount(allocated + liveCount);
    };

    const join = () =>
      setDoc(sessionRef, { lastSeen: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });

    void join().catch(() => {});

    const unsubscribeSessions = onSnapshot(sessionsRef, (snap) => {
      latestSnap = snap;
      apply();
    });

    const unsubscribeAllocation = onSnapshot(
      liveViewersRef,
      (snap) => {
        allocated = allocatedForProduct(snap.data()?.products, productId);
        allocationReady = true;
        apply();
      },
      () => {
        allocated = 0;
        allocationReady = true;
        apply();
      },
    );

    const heartbeat = window.setInterval(() => {
      apply();
      if (!present || document.visibilityState === 'hidden') return;
      updateDoc(sessionRef, { lastSeen: serverTimestamp() }).catch(() => {
        if (present && document.visibilityState !== 'hidden') void join();
      });
    }, HEARTBEAT_MS);

    const leave = () => {
      void deleteDoc(sessionRef).catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        present = false;
        leave();
      } else {
        present = true;
        void join();
      }
    };

    const onPageHide = () => {
      present = false;
      leave();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    return () => {
      cancelled = true;
      present = false;
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      leave();
      unsubscribeSessions();
      unsubscribeAllocation();
    };
  }, [productId]);

  return displayCount;
}
