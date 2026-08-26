import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, calculateAge } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ShieldCheck, UserPlus, Lock, Mail, Calendar, User, Eye, EyeOff } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateOfBirth) {
      showToast('Date of Birth is mandatory for 18+ verification', 'error');
      return;
    }

    const calculatedAge = calculateAge(dateOfBirth);
    if (isNaN(calculatedAge) || calculatedAge < 18) {
      showToast('Registration rejected. You must be 18 years of age or older.', 'error');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name, dateOfBirth);
      showToast('Account successfully created!');
      navigate('/account');
    } catch (err: any) {
      console.error('Signup error:', err);
      showToast(err.message || 'Failed to create account', 'error');
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
              Enjoy fast checkout, order tracking, and exclusive connoisseur offers.
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
                  placeholder="e.g. Alexander Smith"
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

            {/* Mandatory Date of Birth Field */}
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-primary)' }}>
                Date of Birth (Mandatory 18+ Check)
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)' }} />
                <input
                  type="date"
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', color: dateOfBirth ? '#000000' : '#666666', backgroundColor: '#ffffff' }}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Must be at least 18 years old. Stored securely for legal audit compliance.
              </span>
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
              <UserPlus size={18} /> {loading ? 'Verifying & Registering...' : 'Create 18+ Verified Account'}
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
