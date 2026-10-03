import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Display viewer count published by the publishLiveSiteViewers cloud function
 * (pregenerated base + real live presence). Clients only subscribe — they do
 * not invent or boost the number locally.
 */
export function useLiveSiteViewers(enabled: boolean): number {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setViewerCount(0);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'social_proof_live', 'site_viewers'),
      (snap) => {
        const value = snap.data()?.viewerCount;
        setViewerCount(typeof value === 'number' && value > 0 ? value : 0);
      },
      () => {
        setViewerCount(0);
      },
    );

    return unsubscribe;
  }, [enabled]);

  return viewerCount;
}
