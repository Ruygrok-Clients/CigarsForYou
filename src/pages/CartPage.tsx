import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ShoppingBag,
  Trash2,
  Lock,
  ShieldAlert,
  Tag,
  ChevronLeft
} from 'lucide-react';
import type { Coupon } from '../types';

const DEMO_COUPONS: Record<string, Coupon> = {
  'WELCOME10': { code: 'WELCOME10', discountType: 'percentage', amount: 10, active: true, timesClaimed: 12 },
  'CUBAN50': { code: 'CUBAN50', discountType: 'fixed', amount: 50, active: true, timesClaimed: 4 }
};

export const CartPage: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, appliedCoupon, applyCoupon, subtotal, discountAmount, shippingFee, totalAmount } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim().toUpperCase();
    if (DEMO_COUPONS[clean]) {
      applyCoupon(DEMO_COUPONS[clean]);
      showToast(`Coupon "${clean}" applied successfully!`);
    } else {
      showToast('Invalid coupon code. Try WELCOME10 or CUBAN50', 'error');
    }
  };

  const handleRemoveCoupon = () => {
    applyCoupon(null);
    showToast('Coupon removed');
  };

  /**
   * Directly call the createStripeCheckoutSession Cloud Function
   * and redirect the user to Stripe's hosted checkout page.
   * No intermediate platform checkout page.
   */
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setCheckingOut(true);

    try {
      // Build delivery address from logged-in user's saved profile, or leave blank for Stripe to collect
      const savedAddress = userProfile?.address || userProfile?.addresses?.[0];
      const deliveryAddress = {
        id: 'cart-checkout',
        street: savedAddress?.street || '',
        suburb: savedAddress?.suburb || '',
        state: savedAddress?.state || 'NSW',
        postcode: savedAddress?.postcode || '',
        country: 'Australia'
      };

      const customerName = userProfile?.displayName || currentUser?.displayName || 'Customer';
      const customerEmail = currentUser?.email || userProfile?.email || '';
      const customerPhone = userProfile?.phone || '';

      const createSession = httpsCallable(functions, 'createStripeCheckoutSession');
      const res = await createSession({
        items: cart,
        customerName,
        customerEmail,
        customerPhone,
        deliveryAddress,
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount,
        couponCode: appliedCoupon?.code || '',
        originUrl: window.location.origin
      });

      const data = res.data as { checkoutUrl?: string };
      if (data?.checkoutUrl) {
        showToast('Redirecting to Stripe secure checkout...');
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned from Stripe');
      }
    } catch (err: any) {
      console.error('Error launching Stripe checkout:', err);
      showToast(err.message || 'Failed to start Stripe checkout. Please try again.', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '500px' }}>
          <ShoppingBag size={56} style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }} />
          <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '0.75rem' }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            You haven't added any premium Cuban cigars to your humidor cart yet.
          </p>
          <Link to="/shop" className="btn btn-primary btn-lg">
            Browse Cuban Cigars
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>Checkout Preparation</span>
            <h1 style={{ fontSize: '2.5rem', color: '#ffffff' }}>Your Shopping Cart</h1>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={clearCart}>
            Clear Cart
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start'
        }}>
          {/* Cart Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {cart.map((item) => (
              <div
                key={item.product.id || item.product.slug}
                className="card"
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  alignItems: 'center',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--border-subtle)'
                }}>
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ShoppingBag size={28} style={{ color: 'var(--accent-gold)' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {item.product.brand}
                      </span>
                      <h4 style={{ fontSize: '1.15rem', color: '#ffffff', margin: '0.15rem 0' }}>
                        {item.product.name}
                      </h4>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
                      ${item.product.price * item.quantity} AUD
                    </span>
                  </div>

                  {/* Quantity & Delete Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <button
                        onClick={() => updateQuantity(item.product.id || item.product.slug, item.quantity - 1)}
                        style={{ padding: '0.25rem 0.6rem', color: 'var(--text-primary)' }}
                      >
                        -
                      </button>
                      <span style={{ padding: '0 0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id || item.product.slug, item.quantity + 1)}
                        style={{ padding: '0.25rem 0.6rem', color: 'var(--text-primary)' }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id || item.product.slug)}
                      style={{ color: 'var(--accent-ruby)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <Link to="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)', marginTop: '1rem' }}>
              <ChevronLeft size={16} /> Continue Browsing Catalog
            </Link>
          </div>

          {/* Order Summary Column */}
          <div>
            <div className="card" style={{ padding: '1.75rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '1.25rem' }}>Order Summary</h3>

              {/* Coupon Form */}
              <div style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Coupon (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Apply
                  </button>
                </form>

                {appliedCoupon && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.825rem'
                  }}>
                    <span style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Tag size={12} /> {appliedCoupon.code} ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.amount}% off` : `$${appliedCoupon.amount} AUD off`})
                    </span>
                    <button onClick={handleRemoveCoupon} style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Cost Calculations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)} AUD</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                    <span>Discount</span>
                    <span>-${discountAmount.toFixed(2)} AUD</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Australia Express Delivery</span>
                  <span style={{ color: 'var(--accent-gold)' }}>${shippingFee.toFixed(2)} AUD</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: '#2f0d0e'
                }}>
                  <span>Total</span>
                  <span style={{ color: '#2f0d0e' }}>${totalAmount.toFixed(2)} AUD</span>
                </div>
              </div>

              {/* 18+ Warning Pill */}
              <div style={{
                padding: '0.85rem',
                backgroundColor: '#f5f5f7',
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.06)',
                fontSize: '0.8rem',
                color: '#86868b',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                <ShieldAlert size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span>Government-issued 18+ photo ID is checked upon delivery.</span>
              </div>

              {/* Pay Now — Direct Stripe Checkout */}
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="btn btn-primary btn-lg btn-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Lock size={18} />
                {checkingOut ? 'Redirecting to Stripe...' : `Pay $${totalAmount.toFixed(2)} AUD — Secure Checkout`}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                You'll be securely redirected to Stripe to complete payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
