import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { X, Bell, Check } from 'lucide-react';
import { useToast } from './Toast';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';

interface StockNotificationModalProps {
  product: Product | null;
  onClose: () => void;
}

export const StockNotificationModal: React.FC<StockNotificationModalProps> = ({ product, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const [name, setName] = useState(userProfile?.displayName || currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || userProfile?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const nextName = userProfile?.displayName || currentUser?.displayName || '';
    if (nextName) setName(nextName);
    if (currentUser?.email || userProfile?.email) {
      setEmail(currentUser?.email || userProfile?.email || '');
    }
  }, [currentUser, userProfile]);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
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
        name: name.trim(),
        email: email.trim(),
        userId: currentUser?.uid || null,
        customerId: currentUser?.uid || null,
        requestedAt: new Date().toISOString(),
        notified: false
      });
      setSubmitted(true);
      trackEvent('stock_notify_signup', {
        item_id: product.id || product.slug,
        item_name: product.name,
        item_category: product.category || 'cigars'
      });
      showToast('Stock notification request saved!');
    } catch (err) {
      console.error('Error saving stock notification request:', err);
      showToast('Failed to save notification request. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal style={{ zIndex: 10000 }}>
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
            backgroundColor: 'rgba(192, 101, 23, 0.12)',
            color: '#c06517',
            marginBottom: '1rem'
          }}>
            <Bell size={26} />
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Back in Stock Notification
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              marginBottom: '1rem'
            }}>
              <Check size={24} />
            </div>
            <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>You're on the List!</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              We've registered <strong>{email}</strong>. As soon as new inventory arrives, you will be notified.
            </p>
            <button className="btn btn-primary btn-full" onClick={onClose} style={{ borderRadius: '6px' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="notify-name" style={{ color: 'var(--text-primary)' }}>Name</label>
              <input
                id="notify-name"
                type="text"
                required
                className="form-control"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="notify-email" style={{ color: 'var(--text-primary)' }}>Email Address</label>
              <input
                id="notify-email"
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
                style={{ flex: 1, borderRadius: '6px' }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: '6px' }}
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Notify Me'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
