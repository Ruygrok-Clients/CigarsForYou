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
      textAlign: 'center',
      backgroundColor: '#ffffff'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        padding: '3rem 2rem',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        borderRadius: '8px',
        background: '#ffffff',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          color: '#dc2626',
          marginBottom: '1.5rem'
        }}>
          <ShieldAlert size={40} />
        </div>

        <span className="badge badge-red" style={{ marginBottom: '1rem', padding: '0.4rem 1rem' }}>
          Access Restricted
        </span>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#2f0d0e', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
          18+ Age Requirement
        </h1>

        <p style={{ color: '#515154', fontSize: '0.975rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Under Australian Commonwealth and State tobacco laws, you must be <strong>18 years of age or older</strong> to view or purchase cigars and tobacco products.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn btn-primary btn-full"
            onClick={handleReverify}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '6px', padding: '0.85rem 1.5rem' }}
          >
            <RefreshCw size={16} /> I clicked by mistake (Re-verify Age)
          </button>
        </div>
      </div>
    </div>
  );
};
