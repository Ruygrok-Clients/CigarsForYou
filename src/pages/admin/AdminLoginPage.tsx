import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { useAdminContext } from './AdminContext';
import { ShieldCheck, Lock, Mail, UserPlus, KeyRound, Sun, Moon, Eye, EyeOff } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useAdminContext();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupName, setSetupName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSetupMode) {
        // First-Time Setup Mode: Bootstrap Initial Admin Account
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const adminProfile = {
          uid: res.user.uid,
          email: email,
          displayName: setupName || 'Primary Administrator',
          role: 'admin',
          createdAt: new Date().toISOString(),
          dateOfBirth: '1990-01-01'
        };

        await setDoc(doc(db, 'users', res.user.uid), adminProfile);
        await refreshProfile();
        showToast('Initial Admin Account created & logged in!');
        navigate('/admin');
      } else {
        // Standard Sign-In Mode
        const res = await signInWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, 'users', res.user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data();
          const role = profile.role;
          if (role !== 'admin' && role !== 'member' && role !== 'marketing') {
            showToast('Access denied. Account is not registered for portal access.', 'error');
            return;
          }
          await refreshProfile();
          showToast('Welcome to CigarsForYou Admin Portal');
          navigate(role === 'marketing' ? '/admin/news' : '/admin');
          return;
        }

        await refreshProfile();
        showToast('Welcome to CigarsForYou Admin Portal');
        navigate('/admin');
      }
    } catch (err: any) {
      console.error('Admin auth error:', err);
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem',
      position: 'relative'
    }}>
      {/* Theme Toggle Top Right */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            color: 'var(--accent-gold)',
            marginBottom: '1rem',
            border: '1px solid var(--border-color)'
          }}>
            <ShieldCheck size={32} />
          </div>

          <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>
            {isSetupMode ? 'Initial Admin Setup' : 'Business Portal'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            CigarsForYou Australia Operations
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {isSetupMode && (
            <div className="form-group">
              <label className="form-label">Admin Full Name</label>
              <input
                type="text"
                required
                className="form-control form-control--light"
                placeholder="e.g. Lead Manager"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                className="form-control form-control--light"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="admin@cigarsforyou.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="form-control form-control--light"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {isSetupMode ? (
              <><UserPlus size={18} /> Bootstrap Admin Account</>
            ) : (
              <><KeyRound size={18} /> {loading ? 'Authenticating...' : 'Sign In to Portal'}</>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setIsSetupMode(!isSetupMode)}
            style={{ color: 'var(--text-muted)', fontSize: '0.825rem', textDecoration: 'underline' }}
          >
            {isSetupMode ? 'Switch to Standard Sign-In' : 'First-time setup mode (Create initial admin)'}
          </button>
        </div>
      </div>
    </div>
  );
};
