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

const memoryFakeCounts = new Map<string, number>();

function pickWeightedCount(): 1 | 2 | 3 {
  const roll = Math.random();
  if (roll < 0.7) return 1;
  if (roll < 0.9) return 2;
  return 3;
}

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

function getOrCreateFakeCount(productId: string): number {
  const key = `cfy-viewer-fake-${productId}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing === '1' || existing === '2' || existing === '3') return Number(existing);
    const count = pickWeightedCount();
    sessionStorage.setItem(key, String(count));
    return count;
  } catch {
    const cached = memoryFakeCounts.get(productId);
    if (cached) return cached;
    const count = pickWeightedCount();
    memoryFakeCounts.set(productId, count);
    return count;
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

export function useProductViewers(productId: string | undefined): number | null {
  const [displayCount, setDisplayCount] = useState<number | null>(null);

  useEffect(() => {
    if (!productId) {
      setDisplayCount(null);
      return;
    }

    const sessionId = getOrCreateSessionId();
    const fakeCount = getOrCreateFakeCount(productId);
    const sessionRef = doc(db, 'productPresence', productId, 'sessions', sessionId);
    const sessionsRef = collection(db, 'productPresence', productId, 'sessions');

    let latestSnap: QuerySnapshot | null = null;
    let present = true;
    let cancelled = false;

    const apply = () => {
      if (!latestSnap || cancelled) return;
      const liveCount = countLiveSessions(latestSnap, sessionId);
      setDisplayCount(liveCount <= 1 ? fakeCount : liveCount);
    };

    const join = () =>
      setDoc(sessionRef, { lastSeen: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });

    void join().catch(() => {});

    const unsubscribe = onSnapshot(sessionsRef, (snap) => {
      latestSnap = snap;
      apply();
    });

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
      unsubscribe();
    };
  }, [productId]);

  return displayCount;
}
