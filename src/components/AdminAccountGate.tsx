import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, LayoutDashboard, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';

interface AdminAccountGateProps {
  variant: 'modal' | 'inline';
  onClose?: () => void;
}

export const AdminAccountGate: React.FC<AdminAccountGateProps> = ({ variant, onClose }) => {
  const { userProfile, logOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const goToPortal = () => {
    onClose?.();
    navigate('/admin');
  };

  const switchToCustomerLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logOut();
      onClose?.();
      navigate('/login');
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          backgroundColor: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldCheck size={22} style={{ color: 'var(--accent-gold)' }} />
        </div>
        <div>
          <h2 style={{
            fontSize: variant === 'modal' ? '1.35rem' : '1.2rem',
            color: 'var(--text-primary)',
            margin: '0 0 0.35rem',
            lineHeight: 1.25
          }}>
            You are signed in as an administrator
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55 }}>
            This is an admin account{userProfile?.email ? ` (${userProfile.email})` : ''}, not a customer profile.
            Open the admin portal to manage the store, or sign out and use a customer account for shopping.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <button
          type="button"
          className="btn btn-primary btn-full"
          onClick={goToPortal}
          disabled={busy}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <LayoutDashboard size={16} />
          Go to admin portal
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={switchToCustomerLogin}
          disabled={busy}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <LogOut size={16} />
          {busy ? 'Signing out…' : 'Sign out & use a customer account'}
        </button>
      </div>
    </>
  );

  if (variant === 'inline') {
    return (
      <div className="card" style={{
        padding: '1.35rem 1.5rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        backgroundColor: 'rgba(212, 175, 55, 0.06)'
      }}>
        {body}
      </div>
    );
  }

  return (
    <Modal
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-account-gate-title"
        style={{ maxWidth: '440px', position: 'relative', padding: '1.75rem' }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            padding: '0.25rem'
          }}
        >
          <X size={20} />
        </button>
        <div id="admin-account-gate-title" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Administrator account
        </div>
        {body}
      </div>
    </Modal>
  );
};
