import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Lock, X } from 'lucide-react';
import { useAgeGate } from '../context/AgeGateContext';

export const AgeGateModal: React.FC = () => {
  const { isAgeVerified, verifyAge, rejectAge } = useAgeGate();
  const navigate = useNavigate();
  const location = useLocation();

  // If already verified or currently on the age-restricted page, don't show modal
  if (isAgeVerified || location.pathname === '/age-restricted') {
    return null;
  }

  const handleYes = () => {
    verifyAge();
  };

  const handleNo = () => {
    rejectAge();
    navigate('/age-restricted');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '480px', 
          textAlign: 'center',
          padding: '2.5rem 2rem 2rem 2rem',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(30px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          borderRadius: '28px'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', backgroundColor: 'rgba(184, 134, 11, 0.08)', color: '#b8860b', border: '1px solid rgba(184, 134, 11, 0.2)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
          <Lock size={12} />
          <span>Strict Age Verification</span>
        </div>

        <h2 style={{ fontSize: '2.1rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
          Cigars<span style={{ color: '#b8860b' }}>ForYou</span>
        </h2>

        <p style={{ color: '#515154', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.55 }}>
          Under Australian Commonwealth and State law, tobacco products can only be sold and delivered to individuals who are <strong>18 years of age or older</strong>.
        </p>

        <div style={{
          padding: '1.1rem 1.25rem',
          backgroundColor: '#f5f5f7',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          marginBottom: '1.75rem'
        }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem', color: '#1d1d1f' }}>
            Are you 18 years of age or older?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button 
            type="button" 
            className="btn btn-primary btn-lg" 
            onClick={handleYes}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.6rem',
              width: '100%',
              borderRadius: '9999px',
              padding: '0.9rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              backgroundColor: '#1d1d1f',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>Yes, I am 18 or older</span>
            <ArrowRight size={18} />
          </button>
          
          <button 
            type="button" 
            onClick={handleNo}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.4rem',
              width: '100%',
              borderRadius: '9999px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              backgroundColor: 'transparent',
              color: '#86868b',
              border: '1px solid transparent',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1d1d1f';
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#86868b';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={15} />
            <span>I am under 18 — Exit</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <p style={{ fontSize: '0.75rem', color: '#86868b', margin: 0, lineHeight: 1.4 }}>
            Verification required by law upon delivery. Valid government ID must be presented.
          </p>
        </div>
      </div>
    </div>
  );
};

