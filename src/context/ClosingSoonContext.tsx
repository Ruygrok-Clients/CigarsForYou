import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { FINAL_CALL_MESSAGES } from '../constants/finalCallMessages';
import {
  formatCountdown,
  isClosingSoon as computeClosingSoon,
  isWithinFinalCallWindow,
  isWithinGraceWindow,
  msUntilClose,
  msUntilClosingSoon,
  msUntilFinalCallEnd,
  msUntilGraceEnd,
  sydneyDateKey
} from '../utils/deliveryHours';

const POPUP_KEY_PREFIX = 'cfy_closing_popup_v1_';
const GRACE_POPUP_KEY_PREFIX = 'cfy_clerk_grace_popup_v1_';
const FINAL_CALL_POPUP_KEY_PREFIX = 'cfy_final_call_popup_v1_';
const PRESENT_KEY_PREFIX = 'cfy_present_before_close_v1_';
const FINAL_CALL_KEY_PREFIX = 'cfy_final_call_v1_';
const FINAL_CALL_PATHS = new Set(['/cart', '/checkout-details']);

function popupStorageKey(date: Date): string {
  return `${POPUP_KEY_PREFIX}${sydneyDateKey(date)}`;
}

function gracePopupStorageKey(date: Date): string {
  return `${GRACE_POPUP_KEY_PREFIX}${sydneyDateKey(date)}`;
}

function presentStorageKey(date: Date): string {
  return `${PRESENT_KEY_PREFIX}${sydneyDateKey(date)}`;
}

function finalCallPopupStorageKey(date: Date): string {
  return `${FINAL_CALL_POPUP_KEY_PREFIX}${sydneyDateKey(date)}`;
}

function finalCallStorageKey(date: Date): string {
  return `${FINAL_CALL_KEY_PREFIX}${sydneyDateKey(date)}`;
}

function readDismissedDateKey(date: Date, keyFor: (date: Date) => string): string | null {
  try {
    return sessionStorage.getItem(keyFor(date)) === '1' ? sydneyDateKey(date) : null;
  } catch {
    return null;
  }
}

function wasPresentBeforeClose(date: Date): boolean {
  try {
    return sessionStorage.getItem(presentStorageKey(date)) === '1';
  } catch {
    return false;
  }
}

function markPresentBeforeClose(date: Date): void {
  if (msUntilClose(date) <= 0) return;
  try {
    sessionStorage.setItem(presentStorageKey(date), '1');
  } catch {
    // sessionStorage can throw in private modes.
  }
}

function isEligibleForGrace(date: Date): boolean {
  return isWithinGraceWindow(date) && wasPresentBeforeClose(date);
}

function readFinalCallIndex(date: Date): number | null {
  try {
    const raw = sessionStorage.getItem(finalCallStorageKey(date));
    if (raw == null || raw === 'skip') return null;
    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0 || index >= FINAL_CALL_MESSAGES.length) return null;
    return index;
  } catch {
    return null;
  }
}

function isFinalCallActive(date: Date): boolean {
  return isWithinFinalCallWindow(date) && readFinalCallIndex(date) !== null;
}

/** Decide once, on the first tick at or after 7:10pm, for tabs that were open before close. */
function decideFinalCall(date: Date): void {
  if (!wasPresentBeforeClose(date)) return;
  if (msUntilGraceEnd(date) > 0) return;
  if (!isWithinFinalCallWindow(date)) return;

  const key = finalCallStorageKey(date);
  try {
    if (sessionStorage.getItem(key) != null) return;
    if (FINAL_CALL_PATHS.has(window.location.pathname)) {
      const index = Math.floor(Math.random() * FINAL_CALL_MESSAGES.length);
      sessionStorage.setItem(key, String(index));
    } else {
      sessionStorage.setItem(key, 'skip');
    }
  } catch {
    // sessionStorage can throw in private modes.
  }
}

function needsFastTick(date: Date): boolean {
  return computeClosingSoon(date) || isEligibleForGrace(date) || isFinalCallActive(date);
}

function readPresentDateKey(date: Date): string | null {
  if (msUntilClose(date) > 0) {
    markPresentBeforeClose(date);
    return sydneyDateKey(date);
  }
  return wasPresentBeforeClose(date) ? sydneyDateKey(date) : null;
}

interface ClosingSoonContextType {
  isClosingSoon: boolean;
  isClerkGrace: boolean;
  isFinalCall: boolean;
  finalCallMessage: string;
  remainingMs: number;
  formattedCountdown: string;
  showPopup: boolean;
  showClosingPopup: boolean;
  showGracePopup: boolean;
  showFinalCallPopup: boolean;
  dismissPopup: () => void;
  dismissGracePopup: () => void;
  dismissFinalCallPopup: () => void;
  now: Date;
}

const ClosingSoonContext = createContext<ClosingSoonContextType | undefined>(undefined);

export const ClosingSoonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [now, setNow] = useState(() => new Date());
  const [dismissedDateKey, setDismissedDateKey] = useState<string | null>(() => readDismissedDateKey(new Date(), popupStorageKey));
  const [graceDismissedDateKey, setGraceDismissedDateKey] = useState<string | null>(() => readDismissedDateKey(new Date(), gracePopupStorageKey));
  const [presentDateKey, setPresentDateKey] = useState<string | null>(() => readPresentDateKey(new Date()));
  const [finalCallDismissedDateKey, setFinalCallDismissedDateKey] = useState<string | null>(() => readDismissedDateKey(new Date(), finalCallPopupStorageKey));
  const [finalCallIndex, setFinalCallIndex] = useState<number | null>(() => readFinalCallIndex(new Date()));

  useEffect(() => {
    let intervalId = 0;
    let timeoutId = 0;
    let cancelled = false;

    const clearTimers = () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      intervalId = 0;
      timeoutId = 0;
    };

    const notePresence = (date: Date) => {
      if (msUntilClose(date) <= 0) return;
      markPresentBeforeClose(date);
      setPresentDateKey(sydneyDateKey(date));
    };

    const noteFinalCall = (date: Date) => {
      decideFinalCall(date);
      setFinalCallIndex(readFinalCallIndex(date));
    };

    const startFast = () => {
      clearTimers();
      const current = new Date();
      notePresence(current);
      noteFinalCall(current);
      setNow(current);
      intervalId = window.setInterval(() => {
        const next = new Date();
        notePresence(next);
        noteFinalCall(next);
        setNow(next);
        if (!needsFastTick(next)) startSlow();
      }, 1000);
    };

    const startSlow = () => {
      clearTimers();
      const current = new Date();
      notePresence(current);
      noteFinalCall(current);
      setNow(current);
      if (cancelled) return;
      if (needsFastTick(current)) {
        startFast();
        return;
      }

      const untilWindow = msUntilClosingSoon(current);
      if (untilWindow > 0) {
        timeoutId = window.setTimeout(() => {
          if (!cancelled) startFast();
        }, untilWindow + 30);
        return;
      }

      intervalId = window.setInterval(() => {
        const next = new Date();
        notePresence(next);
        noteFinalCall(next);
        setNow(next);
        if (needsFastTick(next)) startFast();
        else if (msUntilClosingSoon(next) > 0) startSlow();
      }, 30000);
    };

    if (needsFastTick(new Date())) startFast();
    else startSlow();

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, []);

  const dateKey = sydneyDateKey(now);
  const closing = computeClosingSoon(now);
  const isClerkGrace = presentDateKey === dateKey && isWithinGraceWindow(now);
  const isFinalCall = presentDateKey === dateKey && finalCallIndex !== null && isWithinFinalCallWindow(now);
  const finalCallMessage = isFinalCall && finalCallIndex !== null ? FINAL_CALL_MESSAGES[finalCallIndex] : '';
  const remainingMs = isFinalCall
    ? msUntilFinalCallEnd(now)
    : isClerkGrace
      ? msUntilGraceEnd(now)
      : closing
        ? msUntilClose(now)
        : 0;
  const showClosingPopup = closing && dismissedDateKey !== dateKey;
  const showGracePopup = isClerkGrace && graceDismissedDateKey !== dateKey;
  const showFinalCallPopup = isFinalCall && finalCallDismissedDateKey !== dateKey;
  const showPopup = showClosingPopup || showGracePopup || showFinalCallPopup;

  const dismissPopup = useCallback(() => {
    const current = new Date();
    const key = sydneyDateKey(current);
    try {
      sessionStorage.setItem(popupStorageKey(current), '1');
    } catch {
      // sessionStorage can throw in private modes; still hide for this view.
    }
    setDismissedDateKey(key);
  }, []);

  const dismissGracePopup = useCallback(() => {
    const current = new Date();
    const key = sydneyDateKey(current);
    try {
      sessionStorage.setItem(gracePopupStorageKey(current), '1');
    } catch {
      // sessionStorage can throw in private modes; still hide for this view.
    }
    setGraceDismissedDateKey(key);
  }, []);

  const dismissFinalCallPopup = useCallback(() => {
    const current = new Date();
    const key = sydneyDateKey(current);
    try {
      sessionStorage.setItem(finalCallPopupStorageKey(current), '1');
    } catch {
      // sessionStorage can throw in private modes; still hide for this view.
    }
    setFinalCallDismissedDateKey(key);
  }, []);

  const value: ClosingSoonContextType = {
    isClosingSoon: closing,
    isClerkGrace,
    isFinalCall,
    finalCallMessage,
    remainingMs,
    formattedCountdown: formatCountdown(remainingMs),
    showPopup,
    showClosingPopup,
    showGracePopup,
    showFinalCallPopup,
    dismissPopup,
    dismissGracePopup,
    dismissFinalCallPopup,
    now
  };

  return (
    <ClosingSoonContext.Provider value={value}>
      {children}
    </ClosingSoonContext.Provider>
  );
};

export const useClosingSoon = () => {
  const context = useContext(ClosingSoonContext);
  if (!context) {
    throw new Error('useClosingSoon must be used within a ClosingSoonProvider');
  }
  return context;
};
