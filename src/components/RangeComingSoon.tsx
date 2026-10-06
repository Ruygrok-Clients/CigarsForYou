import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { Sparkles, Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { useToast } from './Toast';
import type { ProductRange } from '../types';
import { RANGE_COMING_SOON } from '../constants/productRanges';
import { trackEvent } from '../lib/analytics';

export const RangeComingSoon: React.FC<{ range: ProductRange }> = ({ range }) => {
  const copy = RANGE_COMING_SOON[range];
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
        source: copy.source,
        subscribedAt: new Date().toISOString()
      });
      setSubmitted(true);
      trackEvent('waitlist_signup', { lead_type: 'waitlist', source: copy.source });
      showToast(copy.toast);
    } catch (err) {
      console.error('Error saving subscriber email:', err);
      showToast('Failed to register email. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f9f8f6', minHeight: '80vh', padding: '5rem 0 7rem 0', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(192, 101, 23, 0.1)',
          color: '#c06517',
          border: '1px solid rgba(192, 101, 23, 0.25)',
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={40} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#c06517',
            backgroundColor: 'rgba(192, 101, 23, 0.08)',
            padding: '0.45rem 1.1rem',
            borderRadius: '9999px',
            border: '1px solid rgba(192, 101, 23, 0.2)'
          }}>
            {copy.badge}
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#2f0d0e',
          marginBottom: '1rem',
          lineHeight: 1.15
        }}>
          {copy.title} <br />
          <span style={{ color: '#c06517' }}>Coming Soon</span>
        </h1>

        <p style={{ color: '#515154', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '580px', margin: '0 auto 2.5rem auto' }}>
          {copy.body}
        </p>

        <div className="card" style={{
          padding: '2.5rem 2rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06)'
        }}>
          {submitted ? (
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                color: '#16a34a',
                marginBottom: '1rem'
              }}>
                <CheckCircle2 size={30} />
              </div>
              <h3 style={{ fontSize: '1.4rem', color: '#2f0d0e', marginBottom: '0.5rem', fontWeight: 700 }}>You're Registered!</h3>
              <p style={{ color: '#515154', fontSize: '0.95rem' }}>
                We'll email <strong>{email}</strong> the moment {copy.confirm}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontSize: '1.3rem', color: '#2f0d0e', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Bell size={20} style={{ color: '#c06517' }} /> Get Notified At Launch
              </h3>
              <p style={{ color: '#71717a', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Enter your email address below to receive an instant alert when products are listed.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                  id="range-notify-email"
                  type="email"
                  required
                  aria-label="Email address"
                  className="form-control"
                  style={{ flex: '1 1 240px', maxWidth: '360px', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="your.name@example.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ backgroundColor: '#c06517', color: '#ffffff', borderRadius: '6px', padding: '0.75rem 1.5rem', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Registering...' : 'Notify Me'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          color: '#86868b',
          fontSize: '0.82rem',
          marginTop: '2rem'
        }}>
          <ShieldAlert size={16} />
          <span>Strict 18+ age verification will apply upon category release.</span>
        </div>
      </div>
    </div>
  );
};
