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
    <div style={{ padding: '5rem 0 7rem 0', textAlign: 'center', backgroundColor: '#ffffff' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          backgroundColor: 'rgba(217, 119, 6, 0.1)',
          color: '#d97706',
          border: '1px solid rgba(217, 119, 6, 0.25)',
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={38} />
        </div>

        <span className="badge badge-amber" style={{ marginBottom: '1rem', padding: '0.4rem 1rem' }}>
          Category Launch Preview
        </span>

        <h1 style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '1rem' }}>
          Retail Cigarettes <br />
          <span style={{ color: '#d97706' }}>Coming Soon</span>
        </h1>

        <p style={{ color: '#515154', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          We are currently completing regulatory licensing and humidor packing logistics for standard retail cigarette brands in Australia. Purchasing is not currently available for this category.
        </p>

        {/* Email Signup Form */}
        <div className="card" style={{
          padding: '2.5rem 2rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '28px',
          backgroundColor: '#ffffff',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06)'
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
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                color: '#16a34a',
                marginBottom: '1rem'
              }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.5rem', color: '#1d1d1f', marginBottom: '0.5rem', fontWeight: 700 }}>You're Registered!</h3>
              <p style={{ color: '#515154', fontSize: '0.95rem' }}>
                We'll email <strong>{email}</strong> the moment the cigarette catalog opens for doorstep delivery.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontSize: '1.4rem', color: '#1d1d1f', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Bell size={20} style={{ color: '#d97706' }} /> Get Notified First At Launch
              </h3>
              <p style={{ color: '#86868b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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
                  style={{ backgroundColor: '#1d1d1f', color: '#ffffff', borderRadius: '9999px', padding: '0.75rem 1.5rem' }}
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
          color: '#86868b',
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
