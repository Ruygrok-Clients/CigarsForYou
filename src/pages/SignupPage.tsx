import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  clearCachedDiditApproval,
  createDiditSession,
  diditErrorMessage,
  openDiditAndWait,
  readCachedDiditApproval,
  writeCachedDiditApproval
} from '../lib/didit';
import { ShieldCheck, UserPlus, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasCachedApproval] = useState(() => Boolean(readCachedDiditApproval()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cached = readCachedDiditApproval();
      if (cached) {
        try {
          await signUp(email, password, name, { sessionId: cached.sessionId });
          clearCachedDiditApproval();
          showToast('Account successfully created!');
          navigate('/account');
          return;
        } catch (err) {
          const message = diditErrorMessage(err, 'Could not create the account.');
          if (message.toLowerCase().includes('already exists')) {
            showToast(message, 'error');
            return;
          }
          clearCachedDiditApproval();
        }
      }

      const session = await createDiditSession({
        mode: 'signup',
        email: email.trim(),
        displayName: name.trim()
      });
      const status = await openDiditAndWait(session.url, session.sessionId);
      if (status === 'Declined') {
        clearCachedDiditApproval();
        showToast('Age verification was declined. An account was not created.', 'error');
        return;
      }
      if (status !== 'Approved') {
        showToast('Age verification was not approved. An account was not created.', 'error');
        return;
      }

      writeCachedDiditApproval(session.sessionId);
      await signUp(email, password, name, { pendingSignupId: session.pendingSignupId, sessionId: session.sessionId });
      clearCachedDiditApproval();
      showToast('Account successfully created!');
      navigate('/account');
    } catch (err) {
      console.error('Signup error:', err);
      showToast(diditErrorMessage(err, 'Failed to create account'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '4rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '480px' }}>
        <div className="card" style={{ padding: '2.5rem 2rem', border: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>
              <ShieldCheck size={14} /> Strict 18+ Account Registration
            </span>
            <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              Create Your Account
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Enjoy fast checkout, order tracking, and exclusive connoisseur offers. Creating an account opens a secure age check. Your account is created only after that check is approved.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-primary)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', color: '#000000', backgroundColor: '#ffffff' }}
                  placeholder="e.g. Oliver Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-primary)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', color: '#000000', backgroundColor: '#ffffff' }}
                  placeholder="name@example.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-primary)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', color: '#000000', backgroundColor: '#ffffff' }}
                  placeholder="At least 6 characters"
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
              <UserPlus size={18} /> {loading ? 'Verifying & Registering...' : hasCachedApproval ? 'Create account' : 'Verify age & create account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
