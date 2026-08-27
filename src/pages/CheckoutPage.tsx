import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, ShoppingBag } from 'lucide-react';

/**
 * CheckoutPage — Stripe Return Handler Only
 * 
 * This page handles the return URL from Stripe Hosted Checkout.
 * It does NOT contain any forms or order placement logic.
 * Orders are created exclusively by the Stripe webhook (stripeWebhook Cloud Function).
 */
export const CheckoutPage: React.FC = () => {
  const { clearCart } = useCart();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'canceled' | 'empty'>('loading');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const isSuccess = searchParams.get('success') === 'true';
    const isCanceled = searchParams.get('canceled') === 'true';
    const orderNum = searchParams.get('order_number') || '';

    if (isSuccess) {
      setStatus('success');
      setOrderNumber(orderNum);
      clearCart();
      showToast('Payment successful! Your order has been placed.');

      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (_) {
        // confetti not available
      }
    } else if (isCanceled) {
      setStatus('canceled');
      showToast('Payment was canceled. Your cart items are still saved.', 'info');
    } else {
      setStatus('empty');
    }
  }, [searchParams]);

  // Success state — payment completed via Stripe
  if (status === 'success') {
    return (
      <div style={{ padding: '4rem 0 6rem 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="card" style={{ padding: '3rem 2rem', border: '1px solid var(--accent-gold)' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(46, 125, 50, 0.2)',
              color: '#4caf50',
              marginBottom: '1.5rem'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>
              Order Confirmed & Paid
            </span>

            <h1 style={{ fontSize: '2.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              Thank You for Your Order!
            </h1>

            {orderNumber && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '1rem' }}>
                Order reference: <strong style={{ color: 'var(--accent-gold)' }}>{orderNumber}</strong>
              </p>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '440px', marginInline: 'auto' }}>
              Your payment has been processed securely via Stripe. A confirmation email will be sent to <strong>{currentUser?.email || 'your email address'}</strong>.
            </p>

            <div style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '2rem',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.9rem',
              color: 'var(--text-muted)'
            }}>
              <p style={{ margin: 0 }}>
                🚚 Your order will be dispatched via Australia Post Express. Remember to present <strong style={{ color: 'var(--text-primary)' }}>government photo ID (18+)</strong> upon delivery.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/account" className="btn btn-primary">
                View Order History
              </Link>
              <Link to="/shop" className="btn btn-secondary">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Canceled state — user backed out of Stripe Checkout
  if (status === 'canceled') {
    return (
      <div style={{ padding: '4rem 0 6rem 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <div className="card" style={{ padding: '3rem 2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              color: '#dc2626',
              marginBottom: '1.5rem'
            }}>
              <XCircle size={40} />
            </div>

            <h1 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              Payment Canceled
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', maxWidth: '440px', marginInline: 'auto' }}>
              No worries — your cart items are still saved. You can return to your cart and try again when you're ready.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/cart" className="btn btn-primary">
                Return to Cart
              </Link>
              <Link to="/shop" className="btn btn-secondary">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default / empty state — no Stripe params, redirect to cart
  return (
    <div style={{ padding: '6rem 0', textAlign: 'center' }}>
      <div className="container">
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-muted)',
          marginBottom: '1.5rem'
        }}>
          <ShoppingBag size={40} />
        </div>

        <h2 style={{ color: '#ffffff', marginBottom: '1rem' }}>Nothing to See Here</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Head to your cart to proceed with checkout.
        </p>

        <Link to="/cart" className="btn btn-primary">
          Go to Cart
        </Link>
      </div>
    </div>
  );
};
