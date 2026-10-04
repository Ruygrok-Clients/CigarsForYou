import React from 'react';
import { Modal } from './Modal';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Clock, Truck } from 'lucide-react';
import { EXPRESS_DELIVERY_NAME, IMMEDIATE_DISPATCH_NAME } from '../constants/deliveryCopy';
import { useClosingSoon } from '../context/ClosingSoonContext';

export const ClosingSoonModal: React.FC = () => {
  const { showClosingPopup, formattedCountdown, dismissPopup } = useClosingSoon();
  const location = useLocation();

  if (!showClosingPopup || location.pathname === '/age-restricted') {
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
          <span>Store closing soon</span>
        </div>

        <h2 style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#2f0d0e', margin: '0 0 0.65rem', fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
          Last chance for Immediate Dispatch today
        </h2>

        <p style={{ color: '#515154', fontSize: '0.95rem', margin: '0 0 1.15rem', lineHeight: 1.55 }}>
          Immediate Dispatch stops at 7:00pm Sydney time. After that, this option is dispatched the next morning when we open again at 7:00am.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.95rem 1.1rem',
          backgroundColor: '#2f0d0e',
          borderRadius: '6px',
          marginBottom: '1.15rem'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Time left to order
          </span>
          <span style={{ color: '#ffffff', fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formattedCountdown}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.35rem' }}>
          <div style={{ padding: '0.85rem 0.95rem', backgroundColor: '#faf6f5', borderRadius: '6px', border: '1px solid rgba(47, 13, 14, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Truck size={14} color="#c06517" />
              <strong style={{ fontSize: '0.88rem', color: '#2f0d0e' }}>{IMMEDIATE_DISPATCH_NAME}</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#515154', lineHeight: 1.45 }}>
              Official Didi partner delivery, usually 1–3 hours. Order before 7:00pm or it leaves next morning at 7:00am.
            </p>
          </div>
          <div style={{ padding: '0.85rem 0.95rem', backgroundColor: '#faf6f5', borderRadius: '6px', border: '1px solid rgba(47, 13, 14, 0.08)' }}>
            <strong style={{ display: 'block', fontSize: '0.88rem', color: '#2f0d0e', marginBottom: '0.3rem' }}>{EXPRESS_DELIVERY_NAME}</strong>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#515154', lineHeight: 1.45 }}>
              Priority express with courier partners such as StarTrack or AusPost.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={dismissPopup}
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
          <span>Continue browsing</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </Modal>
  );
};
