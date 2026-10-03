import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import {
  clearLoyaltyTierSnapshot,
  normalizeLoyaltyTier,
  readLoyaltyTierSnapshot,
  tierLabel,
  tierRank
} from '../utils/rewards';
import type { LoyaltyTier } from '../types';
import { Modal } from '../components/Modal';

export const OrderConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { userProfile, refreshProfile } = useAuth();
  const orderNumber = searchParams.get('orderNumber') || '';
  const [beforeTier] = useState<LoyaltyTier | null>(() => readLoyaltyTierSnapshot());
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  const tier = normalizeLoyaltyTier(userProfile?.loyaltyTier);
  const showCelebration = Boolean(beforeTier && tierRank(tier) > tierRank(beforeTier) && !celebrationDismissed);

  useEffect(() => {
    if (!beforeTier) return;
    let stopped = false;
    (async () => {
      for (let attempt = 0; attempt < 6 && !stopped; attempt += 1) {
        await refreshProfile();
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    })();
    return () => {
      stopped = true;
    };
    // Poll once for this visit. refreshProfile is a new function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beforeTier]);

  useEffect(() => {
    if (!showCelebration) return;
    clearLoyaltyTierSnapshot();
    confetti({
      particleCount: 160,
      spread: 78,
      origin: { y: 0.55 },
      colors: ['#c06517', '#f59e0b', '#fff7ed', '#6B3F24', '#8A6A12']
    });
  }, [showCelebration]);

  return (
    <div style={{ padding: '4rem 0 6rem' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        <span className="badge badge-gold" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>Order confirmed</span>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>Thank you</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 0 }}>
          {orderNumber
            ? `Order ${orderNumber} is in. We'll take it from here.`
            : 'Your order is in. We\'ll take it from here.'}
        </p>
        <Link to="/account?tab=orders" className="btn btn-primary">View orders</Link>
      </div>

      {showCelebration && (
        <Modal role="dialog" aria-modal="true" aria-labelledby="tier-upgrade-title">
          <div className="modal-content" style={{ maxWidth: '460px', textAlign: 'center', background: '#fff' }}>
            <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>{tierLabel(tier)}</span>
            <h2 id="tier-upgrade-title" style={{ margin: '0 0 0.6rem', color: 'var(--text-primary)' }}>
              You're now {tierLabel(tier)}
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {tierLabel(tier)} unlocks more rewards, and the same rewards cost fewer points.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/account?tab=loyalty" className="btn btn-primary" onClick={() => setCelebrationDismissed(true)}>
                Open Loyalty Program
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => setCelebrationDismissed(true)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
