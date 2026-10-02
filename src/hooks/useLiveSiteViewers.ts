import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

const STALE_MS = 90_000;
const RECOUNT_MS = 15_000;

function countLiveSessions(snap: QuerySnapshot): number {
  const now = Date.now();
  let count = 0;
  snap.forEach((sessionDoc) => {
    const lastSeen = sessionDoc.data().lastSeen;
    const seenAt = typeof lastSeen?.toMillis === 'function' ? lastSeen.toMillis() : null;
    if (typeof seenAt !== 'number') return;
    if (now - seenAt < STALE_MS) count += 1;
  });
  return count;
}

/** Live site-wide viewer count from current presence — a single current value, not a history feed. */
export function useLiveSiteViewers(enabled: boolean): number {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setViewerCount(0);
      return;
    }

    let latestSnap: QuerySnapshot | null = null;
    let cancelled = false;

    const apply = () => {
      if (!latestSnap || cancelled) return;
      setViewerCount(countLiveSessions(latestSnap));
    };

    const unsubscribe = onSnapshot(
      collection(db, 'sitePresence'),
      (snap) => {
        latestSnap = snap;
        apply();
      },
      () => {
        if (!cancelled) setViewerCount(0);
      },
    );

    // Re-apply stale window so counts drop when sessions age out without a write.
    const recount = window.setInterval(apply, RECOUNT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(recount);
      unsubscribe();
    };
  }, [enabled]);

  return viewerCount;
}
