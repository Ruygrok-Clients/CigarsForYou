import { useEffect } from 'react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const HEARTBEAT_MS = 30_000;
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

/** Keeps a live site-wide presence heartbeat for social-proof viewer counts. */
export function useSitePresence(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const sessionId = getOrCreateSessionId();
    const sessionRef = doc(db, 'sitePresence', sessionId);
    let present = true;

    const join = () =>
      setDoc(sessionRef, { lastSeen: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });

    void join().catch(() => {});

    const heartbeat = window.setInterval(() => {
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
      present = false;
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      leave();
    };
  }, [enabled]);
}
