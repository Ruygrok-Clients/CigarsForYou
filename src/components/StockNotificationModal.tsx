import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { X, Bell, Check } from 'lucide-react';
import { useToast } from './Toast';

interface StockNotificationModalProps {
  product: Product | null;
  onClose: () => void;
}

export const StockNotificationModal: React.FC<StockNotificationModalProps> = ({ product, onClose }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'stockNotifications'), {
        productId: product.id || product.slug,
        productName: product.name,
        productBrand: product.brand,
        email: email.trim(),
        requestedAt: new Date().toISOString(),
        notified: false
      });
      setSubmitted(true);
      showToast('Stock notification request saved!');
    } catch (err) {
      console.error('Error saving stock notification request:', err);
      showToast('Failed to save notification request. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '460px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            color: 'var(--text-muted)',
            padding: '0.25rem'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(184, 134, 11, 0.1)',
            color: '#b8860b',
            marginBottom: '1rem'
          }}>
            <Bell size={26} />
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2f0d0e', marginBottom: '0.5rem' }}>
            Back in Stock Notification
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#515154' }}>
            We'll email you immediately when <strong>{product.brand} {product.name}</strong> is back in stock.
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              color: '#16a34a',
              marginBottom: '1rem'
            }}>
              <Check size={24} />
            </div>
            <h4 style={{ color: '#2f0d0e', fontWeight: 700, marginBottom: '0.5rem' }}>You're on the List!</h4>
            <p style={{ fontSize: '0.875rem', color: '#515154', marginBottom: '1.5rem' }}>
              We've registered <strong>{email}</strong>. As soon as new inventory arrives, you will be notified.
            </p>
            <button className="btn btn-primary btn-full" onClick={onClose} style={{ borderRadius: '9999px' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#2f0d0e' }}>Email Address</label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="your.email@example.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, borderRadius: '9999px' }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: '9999px' }}
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Notify Me'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
