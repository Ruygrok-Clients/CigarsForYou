import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ClosingSoonCountdownBanner } from '../components/ClosingSoonCountdownBanner';
import { AgeVerificationNotice } from '../components/AgeVerificationNotice';
import { SpendThresholdPromoBar } from '../components/SpendThresholdPromoBar';
import { CartFrequentlyBoughtTogether } from '../components/CartFrequentlyBoughtTogether';
import { LoyaltyTierChip } from '../components/LoyaltyTierChip';
import { validateAndFetchCoupon } from '../utils/coupon';
import { selectCartFrequentlyBoughtTogether } from '../utils/cartFbt';
import { fetchProducts } from '../services/catalog';
import { couponLabel, toGaItem, trackViewCart } from '../lib/analytics';
import type { Product } from '../types';
import { GoogleReviewsBadge } from '../components/GoogleReviewsBadge';
import {
  ShoppingBag,
  Trash2,
  Tag,
  ChevronLeft,
  Loader2
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    appliedCoupons,
    applyCoupon,
    removeCoupon,
    subtotal,
    couponDiscountAmount,
    spendPromoUnlocked
  } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);

  const merchandiseTotal = Math.max(0, subtotal - couponDiscountAmount);

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

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((list) => {
        if (!cancelled) setCatalog(list);
      })
      .catch((err) => {
        console.error('Error loading cart catalog:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveById = new Map(catalog.filter((product) => product.id).map((product) => [product.id as string, product]));

  const suggestions = selectCartFrequentlyBoughtTogether(
    cart.map((item) => {
      const live = item.product.id ? liveById.get(item.product.id) : undefined;
      return {
        id: item.product.id,
        fbtCompanionIds: live?.fbtCompanionIds ?? item.product.fbtCompanionIds
      };
    }),
    catalog
  );

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

  const handleAddSuggestion = (product: Product) => {
    addToCart(product, 1);
    showToast(`Added ${product.name}`);
  };

  if (cart.length === 0) {
    return (
      <div className="cart-page cart-page--empty">
        <div className="container" style={{ maxWidth: '500px' }}>
          <ClosingSoonCountdownBanner style={{ textAlign: 'left', marginBottom: '1.5rem' }} />
          <ShoppingBag size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h2>Your cart is empty</h2>
          <p>
            You haven't added any premium Cuban cigars yet.
          </p>
          <Link to="/shop" className="btn btn-primary btn-lg">
            Browse Cuban Cigars
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1>Your cart</h1>
          <button className="btn btn-secondary btn-sm cart-clear-btn" onClick={clearCart}>
            Clear cart
          </button>
        </div>

        <ClosingSoonCountdownBanner style={{ marginTop: '0.25rem' }} />

        <SpendThresholdPromoBar subtotal={subtotal} />

        <Link
          to="/shop"
          className="cart-continue-browsing cart-continue-browsing--mobile"
        >
          <ChevronLeft size={16} /> Continue browsing
        </Link>

        <div className="cart-layout">
          <div className="cart-lines">
            {cart.map((item) => {
              const key = item.product.id || item.product.slug;
              const live = item.product.id ? liveById.get(item.product.id) : undefined;
              const rawCount = live?.purchaseCount ?? item.product.purchaseCount;
              const bought = typeof rawCount === 'number' && rawCount > 0 ? Math.floor(rawCount) : null;
              const lineTotal = item.product.price * item.quantity;

              return (
                <article key={key} className="cart-line">
                  <div className="cart-line__media">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt="" />
                    ) : (
                      <ShoppingBag size={22} />
                    )}
                  </div>
                  <div className="cart-line__body">
                    <div className="cart-line__top">
                      <span className="cart-line__brand">{item.product.brand}</span>
                      <span className="cart-line__price">${lineTotal.toFixed(2)}</span>
                    </div>
                    <h2 className="cart-line__name">{item.product.name}</h2>
                    <p className="cart-line__meta">
                      Qty: {item.quantity} × ${item.product.price} AUD
                      {bought !== null && (
                        <>
                          {' '}
                          <span className="cart-line__meta-sep" aria-hidden="true">·</span>
                          {' '}
                          {bought.toLocaleString()} bought
                        </>
                      )}
                    </p>
                    <div className="cart-line__actions">
                      <div className="cart-qty">
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(key, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-line__remove"
                        onClick={() => removeFromCart(key)}
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            <Link
              to="/shop"
              className="cart-continue-browsing cart-continue-browsing--desktop"
            >
              <ChevronLeft size={16} /> Continue browsing
            </Link>
          </div>

          <aside className="cart-summary">
            <div className="cart-summary__head">
              <h2>Order summary</h2>
              <LoyaltyTierChip subtotal={subtotal} couponDiscountAmount={couponDiscountAmount} />
            </div>

            <form className="cart-coupon" onSubmit={handleApplyCoupon}>
              <input
                type="text"
                className="form-control"
                placeholder="Coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={isValidatingCoupon}
                aria-label="Coupon code"
                style={{ textTransform: 'uppercase' }}
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={isValidatingCoupon || !couponCode.trim()}>
                {isValidatingCoupon ? <Loader2 size={14} className="spin" /> : 'Apply'}
              </button>
            </form>

            {appliedCoupons.length > 0 && (
              <div className="cart-coupon-list">
                {appliedCoupons.map((c) => {
                  const minReq = c.minSpend ?? c.minOrderAmount ?? 0;
                  const met = subtotal >= minReq;
                  const label = c.discountType === 'free_shipping'
                    ? 'Waives Immediate Dispatch'
                    : c.discountType === 'percentage'
                    ? `${c.amount}% off`
                    : `$${c.amount} AUD off`;

                  return (
                    <div key={c.code} className={`cart-coupon-chip${met ? '' : ' cart-coupon-chip--unmet'}`}>
                      <span>
                        <Tag size={12} /> <strong>{c.code}</strong> ({label})
                      </span>
                      <button type="button" onClick={() => handleRemoveCoupon(c.code)}>
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <dl className="cart-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>${subtotal.toFixed(2)} AUD</dd>
              </div>
                  {spendPromoUnlocked && (
                <div className="cart-totals__included">
                  <dt>Cedar Humidity Control Delivery Box</dt>
                  <dd>Included</dd>
                </div>
              )}
              {couponDiscountAmount > 0 && (
                <div className="cart-totals__discount">
                  <dt>Coupon</dt>
                  <dd>−${couponDiscountAmount.toFixed(2)} AUD</dd>
                </div>
              )}
              <div className="cart-totals__total">
                <dt>Total</dt>
                <dd>${merchandiseTotal.toFixed(2)} AUD</dd>
              </div>
            </dl>

            <div className="cart-summary__notice">
              <AgeVerificationNotice loggedIn={Boolean(currentUser)} ageVerified={userProfile?.ageVerified === true} />
            </div>

            <Link to="/checkout-details" className="btn btn-primary btn-lg btn-full cart-summary__cta">
              Continue to delivery
            </Link>

            <GoogleReviewsBadge />
          </aside>
        </div>

        <CartFrequentlyBoughtTogether products={suggestions} onAdd={handleAddSuggestion} />
      </div>
    </div>
  );
};
