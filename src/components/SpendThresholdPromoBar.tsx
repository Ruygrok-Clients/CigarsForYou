import React, { useEffect, useRef } from 'react';
import { PartyPopper } from 'lucide-react';
import { getSpendPromoState, SPEND_PROMO_IMMEDIATE_CREDIT, SPEND_PROMO_THRESHOLD } from '../constants/spendPromo';
import { useCart } from '../context/CartContext';
import { trackSelectPromotion, trackViewPromotion } from '../lib/analytics';
import packagingClosed from '../assets/product-packaging/closed.jpeg';
import './SpendThresholdPromoBar.css';

const PROMO_ID = 'spend_380';
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

  const rewardLabel = immediateMode
    ? `$${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit`
    : 'Complimentary Express shipping';

  return (
    <div
      className={`spend-promo${unlocked ? ' spend-promo--unlocked' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="spend-promo__inner">
        <div className="spend-promo__header">
          <div className="spend-promo__intro">
            <p className="spend-promo__eyebrow">
              {unlocked ? (
                <>
                  <PartyPopper size={13} strokeWidth={2} aria-hidden="true" />
                  VIP reward unlocked
                </>
              ) : (
                `Orders over $${threshold.toFixed(0)}`
              )}
            </p>
            <p className="spend-promo__title">
              {unlocked ? (
                <>
                  Your ${threshold.toFixed(0)}+ cigar order includes {rewardLabel} and a Cedar Humidity Control Delivery Box
                </>
              ) : (
                <>
                  ${remaining.toFixed(2)} more for ${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit + Cedar Humidity Control Delivery Box
                </>
              )}
            </p>
          </div>
          <span className="spend-promo__badge">
            {unlocked
              ? (immediateMode ? `$${SPEND_PROMO_IMMEDIATE_CREDIT} + box` : 'Express + box')
              : `$${threshold.toFixed(0)}+`}
          </span>
        </div>

        <ul className="spend-promo__benefits">
          <li className="spend-promo__benefit spend-promo__benefit--dispatch">
            <strong>
              {unlocked
                ? (immediateMode ? `$${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit` : 'Complimentary Express shipping')
                : `$${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit`}
            </strong>
            <span>
              {unlocked
                ? (immediateMode
                  ? `Granted because your subtotal is $${threshold.toFixed(0)} or more — applied to Immediate Dispatch in Sydney and the outskirts.`
                  : `Granted because your subtotal is $${threshold.toFixed(0)} or more — Express shipping included Australia-wide.`)
                : `Or choose complimentary Express Australia-wide once unlocked. Credit applies to Immediate Dispatch in Sydney and the outskirts.`}
            </span>
          </li>
          <li className="spend-promo__benefit spend-promo__benefit--box">
            <div className="spend-promo__media" aria-hidden="true">
              <img
                src={packagingClosed}
                alt=""
                width={72}
                height={72}
                decoding="async"
              />
            </div>
            <div className="spend-promo__benefit-copy">
              <strong>Cedar Humidity Control Delivery Box</strong>
              <span>
                {unlocked
                  ? `Included with this order as your $${threshold.toFixed(0)}+ VIP packaging upgrade — solid cedar presentation on top of the two-way humidity packs that ship with every cigar order.`
                  : 'Solid cedar presentation packaging for elevated orders — a premium finish on top of the two-way humidity packs included with every cigar order.'}
              </span>
            </div>
          </li>
        </ul>

        {unlocked && (
          <button type="button" className="spend-promo__swap" onClick={swapMode}>
            {immediateMode
              ? 'Switch to complimentary Express instead'
              : `Switch to the $${SPEND_PROMO_IMMEDIATE_CREDIT} Immediate Dispatch credit instead`}
          </button>
        )}

        <div className="spend-promo__track-wrap">
          <div
            className="spend-promo__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-valuenow={Math.min(subtotal, threshold)}
            aria-label={`Progress toward $${threshold} for ${rewardLabel} and a Cedar Humidity Control Delivery Box`}
          >
            <div className="spend-promo__fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="spend-promo__meta">
            <span>
              Subtotal <strong>${subtotal.toFixed(2)}</strong>
            </span>
            <span className="spend-promo__goal">
              {unlocked ? `Unlocked at $${threshold.toFixed(0)}+` : `$${threshold.toFixed(0)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
