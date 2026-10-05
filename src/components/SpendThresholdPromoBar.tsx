import React, { useEffect, useRef } from 'react';
import { Gift, PartyPopper } from 'lucide-react';
import { getSpendPromoState, SPEND_PROMO_DISCOUNT, SPEND_PROMO_THRESHOLD } from '../constants/spendPromo';
import { trackSelectPromotion, trackViewPromotion } from '../lib/analytics';
import './SpendThresholdPromoBar.css';

interface SpendThresholdPromoBarProps {
  subtotal: number;
  style?: React.CSSProperties;
  className?: string;
}

export const SpendThresholdPromoBar: React.FC<SpendThresholdPromoBarProps> = ({
  subtotal,
  style,
  className
}) => {
  const { threshold, reward, remaining, progress, unlocked } = getSpendPromoState(subtotal);
  const wasUnlocked = useRef(unlocked);

  useEffect(() => {
    trackViewPromotion(
      'spend_400',
      `Spend $${SPEND_PROMO_THRESHOLD} save $${SPEND_PROMO_DISCOUNT}`,
      unlocked ? 'unlocked' : 'progress'
    );
  }, [unlocked]);

  useEffect(() => {
    if (unlocked && !wasUnlocked.current) {
      trackSelectPromotion(
        'spend_400',
        `Spend $${SPEND_PROMO_THRESHOLD} save $${SPEND_PROMO_DISCOUNT}`,
        'spend_threshold'
      );
    }
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  return (
    <div
      className={`spend-promo${unlocked ? ' spend-promo--unlocked' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="spend-promo__sheen" aria-hidden="true" />
      <div className="spend-promo__inner">
        <div className="spend-promo__top">
          <div className="spend-promo__copy">
            <span className="spend-promo__icon" aria-hidden="true">
              {unlocked ? <PartyPopper size={16} strokeWidth={2.25} /> : <Gift size={16} strokeWidth={2.25} />}
            </span>
            <div>
              <p className="spend-promo__eyebrow">
                {unlocked ? 'Offer unlocked' : 'Spend & save'}
              </p>
              <p className="spend-promo__title">
                {unlocked ? (
                  <>
                    You’ve unlocked <strong>${reward} off</strong> this order
                  </>
                ) : (
                  <>
                    Spend <strong>${remaining.toFixed(2)}</strong> more for{' '}
                    <strong>${reward} off</strong>
                  </>
                )}
              </p>
            </div>
          </div>
          <span className="spend-promo__badge">
            {unlocked ? `−$${reward} AUD` : `$${reward} off at $${threshold}`}
          </span>
        </div>

        <div className="spend-promo__track-wrap">
          <div
            className="spend-promo__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-valuenow={Math.min(subtotal, threshold)}
            aria-label={`Progress toward $${threshold} for $${reward} off`}
          >
            <div className="spend-promo__fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="spend-promo__meta">
            <span>
              Cart subtotal <strong>${subtotal.toFixed(2)} AUD</strong>
            </span>
            <span className="spend-promo__goal">
              {unlocked
                ? 'Discount applied at checkout'
                : `Goal $${threshold.toFixed(0)} AUD`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
