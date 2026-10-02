import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import socialProofImage from '../assets/socialProofImage.png';
import { fetchSocialProofItems } from '../services/socialProof';
import { formatTimeAgo, type SocialProofItem } from '../utils/socialProof';
import './SocialProofToast.css';

const POLL_MS = 30_000;
const VISIBLE_MS = 8_000;
const EXIT_MS = 280;
const GAP_MS = 16_000;

type Phase = 'hidden' | 'in' | 'out';

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

function ToastCopy({ item }: { item: SocialProofItem }) {
  if (item.eventType === 'site_viewers') {
    const count = item.viewerCount ?? 0;
    const label = count === 1 ? 'person is' : 'people are';
    return (
      <p className="social-proof__copy">
        <strong>{count} {label}</strong> viewing this site live right now
      </p>
    );
  }

  if (item.eventType === 'newsletter') {
    return (
      <p className="social-proof__copy">
        <span className="social-proof__line">
          <strong>{item.firstName}</strong> from {item.location}
        </span>
        <span className="social-proof__line">signed up for our newsletter drop</span>
      </p>
    );
  }

  if (item.eventType === 'stock_notify') {
    return (
      <p className="social-proof__copy">
        <span className="social-proof__line">
          <strong>{item.firstName}</strong> from {item.location}
        </span>
        <span className="social-proof__line">
          asked to be notified when <ProductName item={item} /> becomes back in stock
        </span>
      </p>
    );
  }

  return (
    <p className="social-proof__copy">
      <span className="social-proof__line">
        <strong>{item.firstName}</strong> from {item.location}
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

  const [items, setItems] = useState<SocialProofItem[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('hidden');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const itemsRef = useRef(items);
  const indexRef = useRef(0);
  const phaseRef = useRef<Phase>('hidden');
  const timerRef = useRef<number | null>(null);

  itemsRef.current = items;

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const arm = (nextPhase: 'in' | 'out', nextIndex: number) => {
    const length = itemsRef.current.length;
    if (length === 0) {
      clearTimer();
      phaseRef.current = 'hidden';
      setPhase('hidden');
      return;
    }

    const safeIndex = ((nextIndex % length) + length) % length;
    clearTimer();
    indexRef.current = safeIndex;
    phaseRef.current = nextPhase;
    setIndex(safeIndex);
    setPhase(nextPhase);

    if (nextPhase === 'in') {
      setNowMs(Date.now());
      timerRef.current = window.setTimeout(() => arm('out', safeIndex), VISIBLE_MS);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      const latestLength = itemsRef.current.length;
      if (latestLength === 0) {
        phaseRef.current = 'hidden';
        setPhase('hidden');
        return;
      }
      arm('in', (safeIndex + 1) % latestLength);
    }, EXIT_MS + GAP_MS);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await fetchSocialProofItems();
        if (!cancelled) setItems(next);
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

  useEffect(() => {
    if (hiddenRoute || items.length === 0) {
      clearTimer();
      phaseRef.current = 'hidden';
      setPhase('hidden');
      return;
    }

    arm('in', 0);
    return () => {
      clearTimer();
    };
    // Reset only when the queue length or route visibility changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenRoute, items.length]);

  const dismiss = () => {
    if (phaseRef.current !== 'in') return;
    arm('out', indexRef.current);
  };

  const item = items[index];
  if (hiddenRoute || phase === 'hidden' || !item) return null;

  return (
    <aside className="social-proof" aria-live="polite">
      <div className={`social-proof__card social-proof__card--${phase === 'out' ? 'out' : 'in'}`}>
        <div className="social-proof__media">
          <img src={socialProofImage} alt="" />
        </div>
        <div className="social-proof__body">
          <VerifiedBadge />
          <ToastCopy item={item} />
          <div className="social-proof__meta">
            <p className="social-proof__time">{formatTimeAgo(item.displayAtMs, nowMs)}</p>
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
