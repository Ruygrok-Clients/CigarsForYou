import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export const AgeVerificationNotice: React.FC<{ loggedIn: boolean; ageVerified: boolean }> = ({ loggedIn, ageVerified }) => {
  const verified = loggedIn && ageVerified;

  return (
    <div style={{
      padding: '0.85rem',
      backgroundColor: '#f5f5f7',
      borderRadius: '6px',
      border: '1px solid rgba(0,0,0,0.06)',
      fontSize: '0.8rem',
      color: '#86868b',
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'flex-start'
    }}>
      {verified ? (
        <ShieldCheck size={16} style={{ color: '#2e7d32', flexShrink: 0, marginTop: '0.1rem' }} />
      ) : (
        <ShieldAlert size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: '0.1rem' }} />
      )}
      <span>
        {verified ? (
          'You are logged in and already age verified.'
        ) : loggedIn ? (
          'You are logged in. You will need to verify your age before checkout.'
        ) : (
          <>
            You are not logged in. You will need to verify your age. For a faster verification next time,{' '}
            <Link to="/signup" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>create an account</Link>.
          </>
        )}
      </span>
    </div>
  );
};
