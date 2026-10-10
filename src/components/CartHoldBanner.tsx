import React from 'react';
import { Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useClosingSoon } from '../context/ClosingSoonContext';
import { formatCountdown } from '../utils/deliveryHours';

/** Marketing hold countdown. Does not reserve warehouse stock. */
export const CartHoldBanner: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { cart, holdPhase, holdRemainingMs } = useCart();
  const { isClosingSoon, isClerkGrace, isFinalCall } = useClosingSoon();

  if (cart.length === 0 || holdPhase === 'idle') return null;

  const compact = isClosingSoon || isClerkGrace || isFinalCall;
  const expired = holdPhase === 'expired';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: compact ? '0.5rem' : '0.75rem',
        flexWrap: 'wrap',
        padding: compact ? '0.45rem 0.75rem' : '0.7rem 0.95rem',
        marginBottom: compact ? '0.65rem' : '1rem',
        backgroundColor: expired ? '#3a2a1a' : '#24160f',
        color: '#ffffff',
        borderRadius: '6px',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
        <Clock size={compact ? 13 : 15} color="#e8a15a" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: compact ? '0.75rem' : '0.84rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.88)' }}>
          {expired
            ? 'This hold has ended. Your cart is still here.'
            : 'We are holding and reserving your order.'}
        </span>
      </div>
      {!expired && (
        <span style={{
          fontSize: compact ? '0.9rem' : '1.05rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap'
        }}>
          {formatCountdown(holdRemainingMs)}
        </span>
      )}
    </div>
  );
};
