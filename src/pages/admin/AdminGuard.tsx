import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const AdminGuard: React.FC = () => {
  const { currentUser, userProfile, loading, isMemberOrAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-muted)'
      }}>
        Authenticating admin portal credentials...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isMemberOrAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div className="card" style={{ maxWidth: '480px', padding: '3rem 2rem', border: '2px solid var(--accent-ruby)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--accent-ruby)', margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Your account ({userProfile?.email}) is registered as a customer. Administrator or Member role is required to enter this portal.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
