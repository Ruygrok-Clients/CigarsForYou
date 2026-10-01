import React from 'react';
import { Clock } from 'lucide-react';
import { useClosingSoon } from '../context/ClosingSoonContext';

export const ClosingSoonCountdownBanner: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isClosingSoon, isClerkGrace, isFinalCall, finalCallMessage, formattedCountdown } = useClosingSoon();

  if (!isClosingSoon && !isClerkGrace && !isFinalCall) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        padding: '0.7rem 0.95rem',
        marginBottom: '1rem',
        backgroundColor: '#2f0d0e',
        color: '#ffffff',
        borderRadius: '6px',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
        <Clock size={15} color="#e8a15a" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.84rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.88)' }}>
          {isFinalCall
            ? finalCallMessage
            : isClerkGrace
              ? 'The shop clerk gave you extra time — Immediate Dispatch is still open tonight.'
              : 'Immediate Dispatch closes at 7:00pm. After that it goes out next morning at 7:00am.'}
        </span>
      </div>
      <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formattedCountdown}
      </span>
    </div>
  );
};
