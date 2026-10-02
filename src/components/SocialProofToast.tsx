import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import socialProofImage from '../assets/socialProofImage.png';
import { useLiveSiteViewers } from '../hooks/useLiveSiteViewers';
import { fetchSocialProofItems } from '../services/socialProof';
import { formatTimeAgo, type SocialProofItem } from '../utils/socialProof';
import './SocialProofToast.css';

const POLL_MS = 30_000;
const VISIBLE_MS = 8_000;
const EXIT_MS = 280;
const GAP_MS = 15_000;
const VIEWERS_COOLDOWN_MS = 5 * 60 * 1000;

type Phase = 'hidden' | 'in' | 'out';

type DisplayKind = 'viewers' | 'event';

function VerifiedBadge() {
  return (
    <div className="social-proof__verified">
      <svg className="social-proof__verified-icon" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="8" fill="currentColor" />
        <path
          d="M4.4 8.15 6.7 10.4l4.9-5"
          fill="none"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Data Verified</span>
    </div>
  );
}

function ProductName({ item }: { item: SocialProofItem }) {
  if (!item.productName) return null;
  if (item.productSlug) {
    return (
      <Link to={`/product/${item.productSlug}`} className="social-proof__product">
        {item.productName}
      </Link>
    );
  }
  return <span className="social-proof__product">{item.productName}</span>;
}

function ToastCopy({
  kind,
  item,
  viewerCount,
}: {
  kind: DisplayKind;
  item: SocialProofItem | null;
  viewerCount: number;
}) {
  if (kind === 'viewers') {
    const label = viewerCount === 1 ? 'person is' : 'people are';
    return (
      <p className="social-proof__copy">
        <strong>{viewerCount} {label}</strong> viewing this site live right now
      </p>
    );
  }

  if (!item) return null;

  if (item.eventType === 'newsletter') {
    return (
      <p className="social-proof__copy">
        <strong>{item.firstName}</strong> signed up for our newsletter drop
      </p>
    );
  }

  if (item.eventType === 'stock_notify') {
    return (
      <p className="social-proof__copy">
        <strong>{item.firstName}</strong> asked to be notified when{' '}
        <ProductName item={item} /> becomes back in stock
      </p>
    );
  }

  return (
    <p className="social-proof__copy">
      <span className="social-proof__line">
        <strong>{item.firstName}</strong> from NSW
      </span>
      <span className="social-proof__line">
        just ordered <ProductName item={item} />
      </span>
    </p>
  );
}

export function SocialProofToast() {
  const location = useLocation();
  const hiddenRoute = location.pathname.startsWith('/checkout') || location.pathname.startsWith('/admin');
  const liveViewerCount = useLiveSiteViewers(!hiddenRoute);

  const [items, setItems] = useState<SocialProofItem[]>([]);
  const [eventIndex, setEventIndex] = useState(0);
  const [displayKind, setDisplayKind] = useState<DisplayKind>('viewers');
  const [phase, setPhase] = useState<Phase>('hidden');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const itemsRef = useRef(items);
  const eventIndexRef = useRef(0);
  const phaseRef = useRef<Phase>('hidden');
  const displayKindRef = useRef<DisplayKind>('viewers');
  const timerRef = useRef<number | null>(null);
  const lastViewersShownAtRef = useRef<number | null>(null);
  const viewersShownOnceRef = useRef(false);
  const liveViewerCountRef = useRef(liveViewerCount);
  const startedRef = useRef(false);

  itemsRef.current = items;
  liveViewerCountRef.current = liveViewerCount;

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const canShowViewers = () => {
    if (liveViewerCountRef.current < 1) return false;
    if (!viewersShownOnceRef.current) return true;
    const last = lastViewersShownAtRef.current;
    if (last == null) return true;
    return Date.now() - last >= VIEWERS_COOLDOWN_MS;
  };

  const pickNextKind = (): DisplayKind | null => {
    // Viewers first on open, and again only after the cooldown elapses.
    if (canShowViewers()) return 'viewers';
    if (itemsRef.current.length > 0) return 'event';
    return null;
  };

  const arm = (nextPhase: 'in' | 'out', kind: DisplayKind, nextEventIndex: number) => {
    clearTimer();
    displayKindRef.current = kind;
    eventIndexRef.current = nextEventIndex;
    phaseRef.current = nextPhase;
    setDisplayKind(kind);
    setEventIndex(nextEventIndex);
    setPhase(nextPhase);

    if (nextPhase === 'in') {
      setNowMs(Date.now());
      if (kind === 'viewers') {
        viewersShownOnceRef.current = true;
        lastViewersShownAtRef.current = Date.now();
      }
      timerRef.current = window.setTimeout(() => arm('out', kind, nextEventIndex), VISIBLE_MS);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const nextKind = pickNextKind();
      if (!nextKind) {
        phaseRef.current = 'hidden';
        setPhase('hidden');

        // Wake when viewers become eligible again (e.g. no other events in the queue).
        const last = lastViewersShownAtRef.current;
        if (last != null) {
          const remaining = VIEWERS_COOLDOWN_MS - (Date.now() - last);
          if (remaining > 0) {
            timerRef.current = window.setTimeout(() => {
              const kind = pickNextKind();
              if (kind) arm('in', kind, eventIndexRef.current);
            }, remaining + 50);
          }
        }
        return;
      }

      let nextIdx = nextEventIndex;
      if (nextKind === 'event') {
        const length = itemsRef.current.length;
        if (length === 0) {
          if (canShowViewers()) {
            arm('in', 'viewers', nextEventIndex);
            return;
          }
          phaseRef.current = 'hidden';
          setPhase('hidden');
          return;
        }
        // Advance after an event toast; stay put when coming from viewers.
        if (kind === 'event') {
          nextIdx = (nextEventIndex + 1) % length;
        } else {
          nextIdx = ((nextEventIndex % length) + length) % length;
        }
      }
      arm('in', nextKind, nextIdx);
    }, EXIT_MS + GAP_MS);
  };

  const tryStart = (allowEventsWithoutViewers = false) => {
    if (startedRef.current || hiddenRoute) return;
    // Prefer waiting briefly for presence so the first toast can be viewers.
    if (
      !allowEventsWithoutViewers
      && !viewersShownOnceRef.current
      && liveViewerCountRef.current < 1
      && itemsRef.current.length > 0
    ) {
      return;
    }
    const nextKind = pickNextKind();
    if (!nextKind) return;
    startedRef.current = true;
    arm('in', nextKind, 0);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await fetchSocialProofItems();
        // Viewers are a live single value, not historical feed entries.
        const events = next.filter((item) => item.eventType !== 'site_viewers');
        if (!cancelled) setItems(events);
      } catch {
        if (!cancelled) setItems([]);
      }
    };

    void load();
    const poll = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  // Start as soon as we have viewers (preferred) or event items to show.
  useEffect(() => {
    if (hiddenRoute) {
      clearTimer();
      startedRef.current = false;
      phaseRef.current = 'hidden';
      setPhase('hidden');
      return;
    }

    if (!startedRef.current) {
      if (liveViewerCount > 0) {
        tryStart();
      } else if (items.length > 0) {
        // Short grace so presence can land, then open with events if still alone.
        const grace = window.setTimeout(() => {
          if (!startedRef.current) tryStart(true);
        }, 2_000);
        return () => window.clearTimeout(grace);
      }
    }

    // If we became idle with nothing showing but new content arrived, resume.
    if (startedRef.current && phaseRef.current === 'hidden') {
      const nextKind = pickNextKind();
      if (nextKind) {
        arm('in', nextKind, eventIndexRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenRoute, liveViewerCount, items.length]);

  useEffect(() => () => clearTimer(), []);

  const dismiss = () => {
    if (phaseRef.current !== 'in') return;
    arm('out', displayKindRef.current, eventIndexRef.current);
  };

  const eventItem = displayKind === 'event' ? items[eventIndex] ?? null : null;
  if (hiddenRoute || phase === 'hidden') return null;
  if (displayKind === 'event' && !eventItem) return null;
  if (displayKind === 'viewers' && liveViewerCount < 1) return null;

  return (
    <aside className="social-proof" aria-live="polite">
      <div className={`social-proof__card social-proof__card--${phase === 'out' ? 'out' : 'in'}`}>
        <div className="social-proof__media">
          <img src={socialProofImage} alt="" />
        </div>
        <div className="social-proof__body">
          <VerifiedBadge />
          <ToastCopy kind={displayKind} item={eventItem} viewerCount={liveViewerCount} />
          <div className="social-proof__meta">
            {displayKind === 'event' && eventItem ? (
              <p className="social-proof__time">{formatTimeAgo(eventItem.displayAtMs, nowMs)}</p>
            ) : (
              <p className="social-proof__time" aria-hidden="true" />
            )}
            <button
              type="button"
              className="social-proof__dismiss"
              aria-label="Dismiss notification"
              onClick={dismiss}
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
