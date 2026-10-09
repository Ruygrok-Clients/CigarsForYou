import React, { useEffect, useRef } from 'react';
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
      <div className="spend-promo__inner">
        <div className="spend-promo__top">
          <div className="spend-promo__copy">
            <p className="spend-promo__eyebrow">
              {unlocked ? 'Included with this order' : 'With orders over $' + threshold}
            </p>
            <p className="spend-promo__title">
              {unlocked ? (
                immediateMode ? (
                  <>
                    ${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit and a cedar humidity box
                  </>
                ) : (
                  <>
                    Complimentary Express shipping and a cedar humidity box
                  </>
                )
              ) : (
                <>
                  ${remaining.toFixed(2)} more for a ${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit and a cedar humidity box
                </>
              )}
            </p>
            {unlocked && (
              <p className="spend-promo__support">
                {immediateMode
                  ? 'The credit applies to Immediate Dispatch in Sydney and the outskirts.'
                  : 'Express shipping is included Australia-wide.'}
              </p>
            )}
            {unlocked && (
              <button type="button" className="spend-promo__swap" onClick={swapMode}>
                {immediateMode
                  ? 'Use complimentary Express instead'
                  : 'Use the $50 Immediate Dispatch credit instead'}
              </button>
            )}
          </div>
          <span className="spend-promo__badge">
            {unlocked
              ? (immediateMode ? `$${SPEND_PROMO_IMMEDIATE_CREDIT} credit` : 'Express included')
              : `$${threshold}`}
          </span>
        </div>

        <div className="spend-promo__track-wrap">
          <div
            className="spend-promo__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-valuenow={Math.min(subtotal, threshold)}
            aria-label={`Progress toward $${threshold} for complimentary dispatch`}
          >
            <div className="spend-promo__fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="spend-promo__meta">
            <span>
              Subtotal <strong>${subtotal.toFixed(2)}</strong>
            </span>
            <span className="spend-promo__goal">
              {unlocked ? 'Cedar box included' : `$${threshold.toFixed(0)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
