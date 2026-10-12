import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { LoyaltyTier } from '../types';
import {
  applyLoyaltyTierTransition,
  DEFAULT_GOLD_THRESHOLD,
  DEFAULT_SILVER_THRESHOLD,
  normalizeLoyaltyTier,
  pointsEarnedForSpend,
  suggestedLoyaltyTier,
  tierLabel,
  tierRank,
  TIER_COLORS
} from '../utils/rewards';

interface LoyaltyTierChipProps {
  subtotal: number;
  couponDiscountAmount: number;
}

function gapCopy(tier: LoyaltyTier, points: number, silver: number, gold: number): string {
  if (tier === 'gold') {
    if (points >= gold) return 'Holding Gold';
    return `${gold - points} more to hold Gold`;
  }
  if (tier === 'silver') {
    if (points < silver) return `${silver - points} more to hold Silver`;
    const remaining = Math.max(0, gold - points);
    return remaining === 0 ? 'Ready for Gold' : `${remaining} more to Gold`;
  }
  if (points >= gold) return 'Ready for Gold';
  if (points >= silver) {
    const remaining = Math.max(0, gold - points);
    return remaining === 0 ? 'Ready for Gold' : `${remaining} more to Gold`;
  }
  return `${Math.max(0, silver - points)} more to Silver`;
}

function outcomeCopy(current: LoyaltyTier, projected: LoyaltyTier): string {
  if (projected === current) return `Stays ${tierLabel(current)}`;
  if (tierRank(projected) > tierRank(current)) return `Moves up to ${tierLabel(projected)}`;
  return `Moves to ${tierLabel(projected)}`;
}

export const LoyaltyTierChip: React.FC<LoyaltyTierChipProps> = ({
  subtotal,
  couponDiscountAmount
}) => {
  const { currentUser, userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [silverThreshold, setSilverThreshold] = useState(DEFAULT_SILVER_THRESHOLD);
  const [goldThreshold, setGoldThreshold] = useState(DEFAULT_GOLD_THRESHOLD);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const signedIn = Boolean(currentUser);
  const tier = normalizeLoyaltyTier(userProfile?.loyaltyTier);
  const windowPoints = Math.max(0, Math.floor(Number(userProfile?.loyaltyWindowPoints) || 0));
  const cartPoints = pointsEarnedForSpend(subtotal, couponDiscountAmount);
  const projectedWindow = windowPoints + cartPoints;
  const projectedTier = applyLoyaltyTierTransition(
    tier,
    suggestedLoyaltyTier(projectedWindow, silverThreshold, goldThreshold)
  );
  const trackTarget = projectedTier === 'gold' || tier === 'gold' ? goldThreshold : silverThreshold;
  const currentWidth = Math.min(100, (windowPoints / trackTarget) * 100);
  const projectedWidth = Math.min(100, (projectedWindow / trackTarget) * 100);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'rewards'));
        if (cancelled || !settingsSnap.exists()) return;
        const data = settingsSnap.data();
        const silver = Math.floor(Number(data.silverThreshold));
        const gold = Math.floor(Number(data.goldThreshold));
        if (Number.isFinite(silver) && silver >= 1) setSilverThreshold(silver);
        if (Number.isFinite(gold) && gold > silver) setGoldThreshold(gold);
      } catch (err) {
        console.error('Error loading reward thresholds:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = signedIn ? tierLabel(tier) : 'No Loyalty';

  return (
    <div className="loyalty-chip-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`loyalty-chip${signedIn ? ` loyalty-chip--${tier}` : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="loyalty-chip__mark"
          style={{ backgroundColor: signedIn ? TIER_COLORS[tier] : 'var(--text-muted)' }}
          aria-hidden="true"
        />
        {label}
      </button>
      {open && (
        <div className="loyalty-pop" id={panelId} role="dialog" aria-label="Loyalty status">
          {signedIn ? (
            <>
              <div className="loyalty-pop__split">
                <div>
                  <p className="loyalty-pop__kicker">Now</p>
                  <p className="loyalty-pop__value">{tierLabel(tier)}</p>
                  <p className="loyalty-pop__meta">{windowPoints} pts in 30 days</p>
                  <p className="loyalty-pop__meta">{gapCopy(tier, windowPoints, silverThreshold, goldThreshold)}</p>
                </div>
                <div>
                  <p className="loyalty-pop__kicker">This cart</p>
                  <p className="loyalty-pop__value">+{cartPoints} pts</p>
                  <p className="loyalty-pop__meta">{outcomeCopy(tier, projectedTier)}</p>
                  <p className="loyalty-pop__meta">{projectedWindow} pts after checkout</p>
                </div>
              </div>
              <div
                className="loyalty-meter"
                role="img"
                aria-label={`${windowPoints} points now, ${projectedWindow} after this cart, toward ${trackTarget}`}
              >
                <span className="loyalty-meter__projected" style={{ width: `${projectedWidth}%` }} />
                <span className="loyalty-meter__current" style={{ width: `${currentWidth}%`, backgroundColor: TIER_COLORS[tier] }} />
              </div>
              <p className="loyalty-pop__legend">
                <span><i className="loyalty-pop__swatch loyalty-pop__swatch--now" style={{ backgroundColor: TIER_COLORS[tier] }} /> Now</span>
                <span><i className="loyalty-pop__swatch loyalty-pop__swatch--next" /> With this cart</span>
              </p>
              <p className="loyalty-pop__note">
                One point per dollar of merchandise, after coupons. Points count for 30 days from payment. {gapCopy(projectedTier, projectedWindow, silverThreshold, goldThreshold)}.
              </p>
            </>
          ) : (
            <>
              <p className="loyalty-pop__kicker">Members</p>
              <p className="loyalty-pop__value">+{cartPoints} pts</p>
              <p className="loyalty-pop__note">
                Create an account to earn one point per dollar of merchandise after coupons. This cart would add {cartPoints} points toward Bronze, Silver, or Gold tier benefits — and you can spend points in the rewards shop to redeem products for free.
              </p>
              <Link to="/signup" className="loyalty-pop__link" onClick={() => setOpen(false)}>
                Create an account to track and collect points
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};
