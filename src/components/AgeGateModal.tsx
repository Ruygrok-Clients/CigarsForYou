import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
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
          maxWidth: '520px', 
          textAlign: 'center',
          border: '2px solid var(--accent-gold)',
          background: 'linear-gradient(180deg, #241712 0%, #170f0b 100%)'
        }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid var(--accent-gold)',
          margin: '0 auto 1.5rem auto'
        }}>
          <ShieldAlert size={36} style={{ color: 'var(--accent-gold)' }} />
        </div>

        <span className="badge badge-gold" style={{ marginBottom: '1rem' }}>
          Strict Age Verification
        </span>

        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ffffff' }}>
          Welcome to CigarsForYou
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          Under Australian Commonwealth and State law, tobacco products can only be sold and delivered to individuals who are <strong>18 years of age or older</strong>.
        </p>

        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '2rem'
        }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Are you 18 years of age or older?
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-primary btn-lg" 
            onClick={handleYes}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <CheckCircle size={18} /> Yes, I am 18+
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-lg" 
            onClick={handleNo}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <XCircle size={18} /> No, I am under 18
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem', marginBottom: 0 }}>
          By clicking "Yes", you confirm under penalty of law that you are at least 18 years old. Age verification will be checked upon delivery.
        </p>
      </div>
    </div>
  );
};
