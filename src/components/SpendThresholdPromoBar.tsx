import React, { useEffect, useRef } from 'react';
import { Gift, PartyPopper } from 'lucide-react';
import { getSpendPromoState, SPEND_PROMO_IMMEDIATE_CREDIT, SPEND_PROMO_THRESHOLD } from '../constants/spendPromo';
import { useCart } from '../context/CartContext';
import { trackSelectPromotion, trackViewPromotion } from '../lib/analytics';
import './SpendThresholdPromoBar.css';

const PROMO_ID = 'spend_350';
const PROMO_NAME = `Spend $${SPEND_PROMO_THRESHOLD} VIP dispatch`;

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
  const { threshold, remaining, progress, unlocked } = getSpendPromoState(subtotal);
  const { spendPromoRewardMode, setSpendPromoRewardMode } = useCart();
  const wasUnlocked = useRef(unlocked);
  const immediateMode = spendPromoRewardMode === 'immediate_credit';
  const creative = unlocked
    ? `unlocked_${spendPromoRewardMode}`
    : 'progress';

  useEffect(() => {
    trackViewPromotion(PROMO_ID, PROMO_NAME, creative);
  }, [creative]);

  useEffect(() => {
    if (unlocked && !wasUnlocked.current) {
      trackSelectPromotion(PROMO_ID, PROMO_NAME, 'spend_threshold');
    }
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  const swapMode = () => {
    const next = immediateMode ? 'free_express' : 'immediate_credit';
    setSpendPromoRewardMode(next);
    trackSelectPromotion(PROMO_ID, PROMO_NAME, `spend_reward_${next}`);
  };

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
                {unlocked ? 'VIP Dispatch unlocked' : 'VIP Dispatch'}
              </p>
              <p className="spend-promo__title">
                {unlocked ? (
                  immediateMode ? (
                    <>
                      You’ve unlocked a <strong>${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit</strong> + Cedar Humidity Control Box
                    </>
                  ) : (
                    <>
                      You’ve unlocked <strong>Free Express Shipping</strong> + Cedar Humidity Control Box
                    </>
                  )
                ) : (
                  <>
                    Spend <strong>${remaining.toFixed(2)}</strong> more for a{' '}
                    <strong>${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit</strong> — plus a Cedar Humidity Control Box
                  </>
                )}
              </p>
              {unlocked && (
                <p className="spend-promo__support">
                  {immediateMode
                    ? 'Get it in 1–3hrs — we put $50 toward Immediate Dispatch so Sydney and the outskirts can still move fast.'
                    : 'Australia-wide Express is on us.'}
                </p>
              )}
              {unlocked && (
                <button type="button" className="spend-promo__swap" onClick={swapMode}>
                  {immediateMode
                    ? 'Prefer Free Express Shipping instead?'
                    : 'Switch back to $50 Immediate Dispatch credit'}
                </button>
              )}
            </div>
          </div>
          <span className="spend-promo__badge">
            {unlocked
              ? (immediateMode ? `$${SPEND_PROMO_IMMEDIATE_CREDIT} credit` : 'Free Express')
              : `At $${threshold}`}
          </span>
        </div>

        <div className="spend-promo__track-wrap">
          <div
            className="spend-promo__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-valuenow={Math.min(subtotal, threshold)}
            aria-label={`Progress toward $${threshold} for VIP dispatch`}
          >
            <div className="spend-promo__fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="spend-promo__meta">
            <span>
              Cart subtotal <strong>${subtotal.toFixed(2)} AUD</strong>
            </span>
            <span className="spend-promo__goal">
              {unlocked ? 'Cedar box included' : `Goal $${threshold.toFixed(0)} AUD`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
