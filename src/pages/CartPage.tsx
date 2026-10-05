import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ClosingSoonCountdownBanner } from '../components/ClosingSoonCountdownBanner';
import { AgeVerificationNotice } from '../components/AgeVerificationNotice';
import { SpendThresholdPromoBar } from '../components/SpendThresholdPromoBar';
import { validateAndFetchCoupon } from '../utils/coupon';
import { couponLabel, toGaItem, trackViewCart } from '../lib/analytics';
import {
  ShoppingBag,
  Trash2,
  Tag,
  ChevronLeft,
  Loader2,
  Star
} from 'lucide-react';

const GOOGLE_REVIEW_RATING = 4.9;
const GOOGLE_REVIEW_COUNT = 310;

export const CartPage: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    appliedCoupons,
    applyCoupon,
    removeCoupon,
    subtotal,
    couponDiscountAmount,
    spendPromoDiscount
  } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Delivery is chosen on the Customer Details step — cart total is merchandise only.
  const merchandiseTotal = Math.max(
    0,
    subtotal - Math.min(couponDiscountAmount + spendPromoDiscount, subtotal)
  );

  const viewedCart = useRef(false);
  useEffect(() => {
    if (viewedCart.current || cart.length === 0) return;
    viewedCart.current = true;
    trackViewCart(
      merchandiseTotal,
      cart.map((item) => toGaItem(item.product, item.quantity)),
      couponLabel(appliedCoupons.map((coupon) => coupon.code))
    );
  }, [cart, appliedCoupons, merchandiseTotal]);

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
          <ClosingSoonCountdownBanner style={{ textAlign: 'left', marginBottom: '1.5rem' }} />
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
            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>Your Shopping Cart</h1>
          </div>
          <button className="btn btn-secondary btn-sm cart-clear-btn" onClick={clearCart}>
            Clear Cart
          </button>
        </div>

        <ClosingSoonCountdownBanner style={{ marginTop: '0.25rem' }} />

        <SpendThresholdPromoBar subtotal={subtotal} />

        <Link
          to="/shop"
          className="cart-continue-browsing cart-continue-browsing--mobile"
        >
          <ChevronLeft size={16} /> Continue Browsing Catalog
        </Link>

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
                  alignItems: 'flex-start',
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

                {/* Info — stacked so brand/price can share a full-width row */}
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-muted)',
                      minWidth: 0
                    }}>
                      {item.product.brand}
                    </span>
                    <span style={{
                      fontWeight: 700,
                      color: 'var(--accent-gold)',
                      fontSize: '1.1rem',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      marginLeft: 'auto'
                    }}>
                      ${item.product.price * item.quantity}
                    </span>
                  </div>

                  <h4 style={{
                    fontSize: '1.15rem',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.25,
                    wordBreak: 'break-word'
                  }}>
                    {item.product.name}
                  </h4>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id || item.product.slug, item.quantity - 1)}
                        style={{ padding: '0.25rem 0.6rem', color: 'var(--text-primary)' }}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span style={{ padding: '0 0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id || item.product.slug, item.quantity + 1)}
                        style={{ padding: '0.25rem 0.6rem', color: 'var(--text-primary)' }}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id || item.product.slug)}
                      aria-label={`Remove ${item.product.name} from cart`}
                      style={{
                        color: 'var(--accent-ruby)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.35rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <Link
              to="/shop"
              className="cart-continue-browsing cart-continue-browsing--desktop"
            >
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
                        ? 'Waives Immediate Dispatch'
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

                {spendPromoDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                    <span>Spend & Save ($400+)</span>
                    <span>-${spendPromoDiscount.toFixed(2)} AUD</span>
                  </div>
                )}

                {couponDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                    <span>Coupon Discount</span>
                    <span>-${couponDiscountAmount.toFixed(2)} AUD</span>
                  </div>
                )}

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
                  <span style={{ color: 'var(--text-primary)' }}>${merchandiseTotal.toFixed(2)} AUD</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <AgeVerificationNotice loggedIn={Boolean(currentUser)} ageVerified={userProfile?.ageVerified === true} />
              </div>

              <Link
                to="/checkout-details"
                className="btn btn-primary btn-lg btn-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                Continue to Delivery Details
              </Link>

              <div
                className="cart-google-reviews"
                aria-label={`Rated ${GOOGLE_REVIEW_RATING} out of 5 on Google from ${GOOGLE_REVIEW_COUNT} reviews`}
              >
                <span className="cart-google-reviews__g" aria-hidden="true">G</span>
                <div className="cart-google-reviews__body">
                  <div className="cart-google-reviews__row">
                    <strong>{GOOGLE_REVIEW_RATING.toFixed(1)}</strong>
                    <span className="cart-google-reviews__stars" aria-hidden="true">
                      {Array.from({ length: 5 }, (_, i) => {
                        const fill = Math.min(1, Math.max(0, GOOGLE_REVIEW_RATING - i));
                        return (
                          <span key={i} className="cart-google-reviews__star-wrap">
                            <Star size={14} strokeWidth={0} className="cart-google-reviews__star-empty" />
                            <span className="cart-google-reviews__star-fill" style={{ width: `${fill * 100}%` }}>
                              <Star size={14} strokeWidth={0} fill="currentColor" />
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  </div>
                  <p className="cart-google-reviews__meta">
                    Based on <strong>{GOOGLE_REVIEW_COUNT}</strong> Google reviews
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
