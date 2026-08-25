import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { useAgeGate } from '../context/AgeGateContext';
import { useNavigate } from 'react-router-dom';

export const AgeRestrictedPage: React.FC = () => {
  const { verifyAge } = useAgeGate();
  const navigate = useNavigate();

  const handleReverify = () => {
    verifyAge();
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.25rem',
      textAlign: 'center'
    }}>
      <div className="card" style={{
        maxWidth: '540px',
        padding: '3rem 2rem',
        border: '2px solid var(--accent-ruby)',
        background: 'linear-gradient(180deg, #241712 0%, #170f0b 100%)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(155, 44, 44, 0.2)',
          color: 'var(--accent-ruby)',
          marginBottom: '1.5rem'
        }}>
          <ShieldAlert size={44} />
        </div>

        <span className="badge badge-red" style={{ marginBottom: '1rem', padding: '0.4rem 1rem' }}>
          Access Restricted
        </span>

        <h1 style={{ fontSize: '2.4rem', color: '#ffffff', marginBottom: '1rem' }}>
          18+ Age Requirement
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Under Australian Commonwealth and State tobacco laws, you must be <strong>18 years of age or older</strong> to view or purchase cigars and tobacco products.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn btn-secondary btn-full"
            onClick={handleReverify}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> I clicked by mistake (Re-verify Age)
          </button>
        </div>
      </div>
    </div>
  );
};
