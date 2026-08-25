import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { Sparkles, Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useToast } from '../components/Toast';

export const CigarettesComingSoonPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'emailSubscribers'), {
        email: email.trim(),
        source: 'cigarettes-coming-soon',
        subscribedAt: new Date().toISOString()
      });
      setSubmitted(true);
      showToast('Thank you! You will be notified when cigarettes launch.');
    } catch (err) {
      console.error('Error saving subscriber email:', err);
      showToast('Failed to register email. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '5rem 0 7rem 0', textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(197, 108, 40, 0.15)',
          color: 'var(--accent-amber)',
          border: '1px solid rgba(197, 108, 40, 0.3)',
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={40} />
        </div>

        <span className="badge badge-amber" style={{ marginBottom: '1rem', padding: '0.4rem 1rem' }}>
          Category Launch Preview
        </span>

        <h1 style={{ fontSize: '3rem', color: '#ffffff', marginBottom: '1rem' }}>
          Retail Cigarettes <br />
          <span style={{ color: 'var(--accent-amber)', fontStyle: 'italic' }}>Coming Soon</span>
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          We are currently completing regulatory licensing and humidor packing logistics for standard retail cigarette brands in Australia. Purchasing is not currently available for this category.
        </p>

        {/* Email Signup Form */}
        <div className="card" style={{
          padding: '2.5rem 2rem',
          border: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, #281e18 0%, #1c130d 100%)'
        }}>
          {submitted ? (
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(46, 125, 50, 0.2)',
                color: '#4caf50',
                marginBottom: '1rem'
              }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>You're Registered!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                We'll email <strong>{email}</strong> the moment the cigarette catalog opens for doorstep delivery.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Bell size={20} style={{ color: 'var(--accent-amber)' }} /> Get Notified First At Launch
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Enter your email address below to receive an instant launch notification.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  required
                  className="form-control"
                  style={{ flex: '1 1 240px' }}
                  placeholder="your.name@example.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ backgroundColor: 'var(--accent-amber)', color: '#ffffff' }}
                >
                  {submitting ? 'Registering...' : 'Notify Me'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Regulatory Note */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          marginTop: '2rem'
        }}>
          <ShieldAlert size={16} />
          <span>Strict 18+ age gating will apply upon category release.</span>
        </div>
      </div>
    </div>
  );
};
