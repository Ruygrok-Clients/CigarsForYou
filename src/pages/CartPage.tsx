import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import { validateAndFetchCoupon } from '../utils/coupon';
import {
  ShoppingBag,
  Trash2,
  ShieldAlert,
  Tag,
  ChevronLeft,
  ArrowRight,
  Loader2
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, appliedCoupons, applyCoupon, removeCoupon, subtotal, discountAmount, shippingFee, totalAmount, isFreeShipping } = useCart();
  const { showToast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const result = await validateAndFetchCoupon(couponCode, subtotal);
      if (result.success && result.coupon) {
        applyCoupon(result.coupon);
        showToast(`Coupon "${result.coupon.code}" applied successfully!`);
        setCouponCode('');
      } else {
        showToast(result.error || 'Invalid coupon code.', 'error');
      }
    } catch (err: any) {
      console.error('Error validating coupon:', err);
      showToast('Failed to validate coupon. Please try again.', 'error');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = (code: string) => {
    removeCoupon(code);
    showToast(`Coupon ${code} removed`);
  };

  if (cart.length === 0) {
    return (
      <div style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '500px' }}>
          <ShoppingBag size={56} style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }} />
          <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Your Cart is Empty</h2>
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
        <div className="cart-header">
          <div>
            <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>Checkout Preparation</span>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>Your Shopping Cart</h1>
          </div>
          <button className="btn btn-secondary btn-sm cart-clear-btn" onClick={clearCart}>
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
                  backgroundColor: 'var(--bg-surface-elevated)',
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
                      <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0.15rem 0' }}>
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
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Order Summary</h3>

              {/* Coupon Form */}
              <div style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Coupon (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={isValidatingCoupon}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={isValidatingCoupon || !couponCode.trim()}>
                    {isValidatingCoupon ? <Loader2 size={14} className="spin" /> : 'Apply'}
                  </button>
                </form>

                {appliedCoupons.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {appliedCoupons.map((c) => {
                      const minReq = c.minSpend ?? c.minOrderAmount ?? 0;
                      const met = subtotal >= minReq;
                      const label = c.discountType === 'free_shipping'
                        ? 'Free Express Delivery'
                        : c.discountType === 'percentage'
                        ? `${c.amount}% off`
                        : `$${c.amount} AUD off`;

                      return (
                        <div key={c.code} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.75rem',
                          backgroundColor: met ? 'rgba(212, 175, 55, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${met ? 'var(--border-color)' : 'rgba(244, 67, 54, 0.3)'}`,
                          fontSize: '0.825rem'
                        }}>
                          <span style={{ color: met ? 'var(--accent-gold)' : '#ff5252', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Tag size={12} /> <strong>{c.code}</strong> ({label})
                          </span>
                          <button type="button" onClick={() => handleRemoveCoupon(c.code)} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Remove
                          </button>
                        </div>
                      );
                    })}
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
                  {isFreeShipping ? (
                    <span style={{ color: '#4caf50', fontWeight: 600 }}>FREE ($0.00 AUD)</span>
                  ) : (
                    <span style={{ color: 'var(--accent-gold)' }}>${shippingFee.toFixed(2)} AUD</span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'var(--text-primary)'
                }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--text-primary)' }}>${totalAmount.toFixed(2)} AUD</span>
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

              {/* Proceed to Customer Details Intermediary Step */}
              <Link
                to="/checkout-details"
                className="btn btn-primary btn-lg btn-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                Proceed to Customer Details <ArrowRight size={18} />
              </Link>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Enter shipping details & confirm order in the next step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
