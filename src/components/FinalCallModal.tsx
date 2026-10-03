import React from 'react';
import { Modal } from './Modal';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { useClosingSoon } from '../context/ClosingSoonContext';

export const FinalCallModal: React.FC = () => {
  const { showFinalCallPopup, formattedCountdown, finalCallMessage, dismissFinalCallPopup } = useClosingSoon();
  const location = useLocation();

  if (!showFinalCallPopup || location.pathname === '/age-restricted') {
    return null;
  }

  return (
    <Modal style={{ zIndex: 99999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          textAlign: 'left',
          padding: '2.25rem 2rem 1.75rem',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(30px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', backgroundColor: 'rgba(192, 101, 23, 0.12)', color: '#c06517', border: '1px solid rgba(192, 101, 23, 0.28)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.1rem' }}>
          <Clock size={12} />
          <span>Final call</span>
        </div>

        <h2 style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#2f0d0e', margin: '0 0 0.85rem', fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
          A note from the counter
        </h2>

        <div style={{
          padding: '0.95rem 1rem',
          backgroundColor: '#faf6f5',
          borderRadius: '6px',
          border: '1px solid rgba(47, 13, 14, 0.08)',
          marginBottom: '1.15rem'
        }}>
          <p style={{ margin: 0, color: '#2f0d0e', fontSize: '0.95rem', lineHeight: 1.55 }}>
            {finalCallMessage}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.95rem 1.1rem',
          backgroundColor: '#2f0d0e',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Final time left
          </span>
          <span style={{ color: '#ffffff', fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formattedCountdown}
          </span>
        </div>

        <p style={{ color: '#515154', fontSize: '0.88rem', margin: '0 0 1.35rem', lineHeight: 1.5 }}>
          When this ends, Immediate Dispatch moves to tomorrow morning at 7:00am.
        </p>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={dismissFinalCallPopup}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            width: '100%',
            borderRadius: '6px',
            padding: '0.9rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            backgroundColor: '#c06517',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(192, 101, 23, 0.28)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#a2520d';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#c06517';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span>Finish my order</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </Modal>
  );
};
