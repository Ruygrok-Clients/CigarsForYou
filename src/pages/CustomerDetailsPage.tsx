import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useRewardsCart } from '../context/RewardsCartContext';
import { useAuth } from '../context/AuthContext';
import { useLocationSelection } from '../context/LocationContext';
import { useToast } from '../components/Toast';
import { useClosingSoon } from '../context/ClosingSoonContext';
import { ClosingSoonCountdownBanner } from '../components/ClosingSoonCountdownBanner';
import { SpendThresholdPromoBar } from '../components/SpendThresholdPromoBar';
import { validateAndFetchCoupon } from '../utils/coupon';
import { AUSTRALIAN_STATES } from '../constants/locations';
import { DIDI_PARTNER_BLURB, EXPRESS_DELIVERY_FEE, EXPRESS_DELIVERY_NAME, IMMEDIATE_DISPATCH_NAME } from '../constants/deliveryCopy';
import { quoteImmediateDispatch } from '../services/immediateDispatch';
import {
  freeExpressHoursMessage,
  getDeliveryWindow,
  immediateDispatchHoursMessage
} from '../utils/deliveryHours';
import type { DeliveryMethod } from '../types';
import { normalizeLoyaltyTier, resolveProductPointsCost } from '../utils/rewards';
import { AgeVerificationNotice } from '../components/AgeVerificationNotice';
import { ensureAgeVerified } from '../lib/didit';
import {
  couponLabel,
  toGaItem,
  toRewardGaItem,
  trackAddShippingInfo,
  trackBeginCheckout
} from '../lib/analytics';
import {
  ShoppingBag,
  Tag,
  ChevronLeft,
  User,
  MapPin,
  Sparkles,
  Loader2,
  Info,
  Truck
} from 'lucide-react';

const STATE_LABELS: Record<string, string> = {
  NSW: 'NSW - New South Wales',
  VIC: 'VIC - Victoria',
  QLD: 'QLD - Queensland',
  WA: 'WA - Western Australia',
  SA: 'SA - South Australia',
  TAS: 'TAS - Tasmania',
  ACT: 'ACT - Capital Territory',
  NT: 'NT - Northern Territory'
};

export const CustomerDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    appliedCoupons,
    applyCoupon,
    removeCoupon,
    subtotal,
    couponDiscountAmount,
    spendPromoDiscount,
    totalAmount,
    isFreeShipping: productIsFreeShipping,
    deliveryMethod: productDeliveryMethod,
    setDeliveryMethod: setProductDeliveryMethod,
    setImmediateDispatchFee: setProductImmediateDispatchFee,
    shippingFee: productShippingFee
  } = useCart();
  const [searchParams] = useSearchParams();
  const rewardsMode = searchParams.get('mode') === 'rewards';
  const rewardsCart = useRewardsCart();
  const deliveryMethod = rewardsMode ? rewardsCart.deliveryMethod : productDeliveryMethod;
  const setDeliveryMethod = rewardsMode ? rewardsCart.setDeliveryMethod : setProductDeliveryMethod;
  const setImmediateDispatchFee = rewardsMode ? rewardsCart.setImmediateDispatchFee : setProductImmediateDispatchFee;
  const isFreeShipping = rewardsMode ? false : productIsFreeShipping;
  const shippingFee = rewardsMode ? rewardsCart.shippingFee : productShippingFee;
  const { currentUser, userProfile, loading: authLoading, refreshProfile } = useAuth();
  const loyaltyTier = normalizeLoyaltyTier(userProfile?.loyaltyTier);
  const { selectedLocation } = useLocationSelection();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [stateVal, setStateVal] = useState(selectedLocation);
  const [postcode, setPostcode] = useState('');
  const [country] = useState('Australia');
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [openInfo, setOpenInfo] = useState<DeliveryMethod | null>('immediate');
  const [verifyingAge, setVerifyingAge] = useState(false);
  const [ageBlockMessage, setAgeBlockMessage] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [quote, setQuote] = useState<{ feeAud: number; approxKm: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const profileStamp = [
    currentUser?.uid ?? '',
    userProfile?.displayName ?? '',
    userProfile?.email ?? '',
    userProfile?.phone ?? '',
    userProfile?.address?.street ?? userProfile?.addresses?.[0]?.street ?? '',
    userProfile?.address?.suburb ?? userProfile?.addresses?.[0]?.suburb ?? '',
    userProfile?.address?.state ?? userProfile?.addresses?.[0]?.state ?? '',
    userProfile?.address?.postcode ?? userProfile?.addresses?.[0]?.postcode ?? ''
  ].join('|');
  const [appliedProfileStamp, setAppliedProfileStamp] = useState('');

  if ((currentUser || userProfile) && appliedProfileStamp !== profileStamp) {
    setAppliedProfileStamp(profileStamp);
    const nextName = userProfile?.displayName || currentUser?.displayName || '';
    const nextEmail = currentUser?.email || userProfile?.email || '';
    const nextPhone = userProfile?.phone || '';
    const addr = userProfile?.address || userProfile?.addresses?.[0];
    if (nextName) setName((current) => current || nextName);
    if (nextEmail) setEmail((current) => current || nextEmail);
    if (nextPhone) setPhone((current) => current || nextPhone);
    if (addr?.street) setStreet((current) => current || addr.street);
    if (addr?.suburb) setSuburb((current) => current || addr.suburb);
    if (addr?.state) setStateVal(addr.state);
    if (addr?.postcode) setPostcode((current) => current || addr.postcode);
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (rewardsMode) {
      if (authLoading) return;
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (rewardsCart.items.length === 0) {
        navigate('/account?tab=rewards&panel=shop');
      }
      return;
    }
    if (cart.length === 0) {
      navigate('/cart');
    }
  }, [rewardsMode, authLoading, currentUser, rewardsCart.items.length, cart, navigate]);

  const postcodeReady = /^\d{4}$/.test(postcode.trim());
  const stateMatches = stateVal === selectedLocation;
  const addressReady =
    street.trim().length >= 3 &&
    suburb.trim().length >= 2 &&
    postcodeReady &&
    stateVal === 'NSW' &&
    stateMatches;

  useEffect(() => {
    if (!addressReady) {
      setQuote(null);
      setQuoteFailed(false);
      setQuoteLoading(false);
      return;
    }

    let cancelled = false;
    setQuote(null);
    setQuoteFailed(false);
    setQuoteLoading(true);
    const timer = window.setTimeout(() => {
      quoteImmediateDispatch({
        street: street.trim(),
        suburb: suburb.trim(),
        state: stateVal,
        postcode: postcode.trim()
      })
        .then((next) => {
          if (cancelled) return;
          setQuote(next);
          setQuoteFailed(false);
        })
        .catch(() => {
          if (cancelled) return;
          setQuote(null);
          setQuoteFailed(true);
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addressReady, street, suburb, stateVal, postcode]);

  const immediateAvailable = Boolean(quote);
  const { isClerkGrace, isFinalCall } = useClosingSoon();
  const deliveryWindow = getDeliveryWindow(now);

  const quotedFee = quote?.feeAud ?? 0;

  useEffect(() => {
    if (quoteLoading) return;
    if (!immediateAvailable && deliveryMethod === 'immediate') {
      setDeliveryMethod('express');
    }
  }, [quoteLoading, immediateAvailable, deliveryMethod, setDeliveryMethod]);

  useEffect(() => {
    if (deliveryMethod !== 'immediate') {
      setImmediateDispatchFee(0);
      return;
    }
    if (quoteLoading) return;
    setImmediateDispatchFee(quotedFee);
  }, [deliveryMethod, quotedFee, quoteLoading, setImmediateDispatchFee]);

  const checkoutItems = rewardsMode
    ? rewardsCart.items.map((item) => toRewardGaItem(item.product, item.quantity))
    : cart.map((item) => toGaItem(item.product, item.quantity));
  const checkoutCoupon = rewardsMode ? undefined : couponLabel(appliedCoupons.map((coupon) => coupon.code));
  const checkoutValue = rewardsMode ? rewardsCart.shippingFee : totalAmount;
  const checkoutType = rewardsMode ? 'rewards' : 'paid';

  const beganCheckout = useRef(false);
  useEffect(() => {
    if (beganCheckout.current || checkoutItems.length === 0) return;
    beganCheckout.current = true;
    trackBeginCheckout(checkoutValue, checkoutItems, checkoutCoupon, checkoutType);
  }, [checkoutCoupon, checkoutItems, checkoutType, checkoutValue]);

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
    } catch (err) {
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

  const selectMethod = (method: DeliveryMethod) => {
    if (method === 'immediate' && !immediateAvailable) return;
    setDeliveryMethod(method);
    setOpenInfo(method);
  };

  const handleContinue = async (destination: 'rewards' | 'checkout') => {
    if (verifyingAge || authLoading) return;
    if (!name.trim() || !email.trim() || !phone.trim() || !street.trim() || !suburb.trim() || !postcodeReady) {
      showToast('Please complete your contact and delivery details.', 'error');
      return;
    }
    if (deliveryMethod === 'immediate' && !immediateAvailable) {
      showToast('Immediate Dispatch is not available for this address.', 'error');
      return;
    }

    setVerifyingAge(true);
    setAgeBlockMessage('');
    try {
      const result = await ensureAgeVerified({
        mode: currentUser ? 'account' : 'guest',
        alreadyVerified: userProfile?.ageVerified === true
      });
      if (!result.ok) {
        if (result.hardBlock) setAgeBlockMessage(result.message);
        showToast(result.message, 'error');
        return;
      }
      if (currentUser) await refreshProfile();
      trackAddShippingInfo(checkoutValue, deliveryMethod, checkoutItems, checkoutCoupon, checkoutType);
      if (destination === 'rewards') {
        rewardsCart.setCheckoutDraft({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          street: street.trim(),
          suburb: suburb.trim(),
          state: stateVal,
          postcode: postcode.trim(),
          country,
          ageConfirmed: true
        });
        navigate('/checkout?mode=rewards');
        return;
      }
      navigate('/checkout');
    } finally {
      setVerifyingAge(false);
    }
  };

  const rewardsReturnPath = '/account?tab=rewards&panel=shop';
  const summaryCount = rewardsMode
    ? rewardsCart.items.reduce((sum, item) => sum + item.quantity, 0)
    : cart.reduce((sum, item) => sum + item.quantity, 0);

  if (rewardsMode) {
    if (authLoading || rewardsCart.items.length === 0) return null;
  } else if (cart.length === 0) {
    return null;
  }

  const addressFieldsReady = street.trim().length >= 3 && suburb.trim().length >= 2 && postcodeReady;
  const immediateStatus = !addressFieldsReady
    ? 'Enter your street, suburb, and a 4-digit postcode to price Immediate Dispatch.'
    : !stateMatches
      ? `This address is in ${stateVal}, but your selected location is ${selectedLocation}. Immediate Dispatch is only available when they match.`
      : stateVal !== 'NSW'
        ? 'Immediate Dispatch is only available for NSW addresses.'
        : quoteLoading
          ? 'Pricing Immediate Dispatch for this address…'
          : !quote
            ? quoteFailed
              ? 'We could not price Immediate Dispatch for this address. Check the details or choose Express Delivery.'
              : 'Immediate Dispatch is not available for this address.'
            : isFinalCall
          ? 'The clerk is keeping Immediate Dispatch open for this last stretch. Order before the extra time ends and we will dispatch this straight away.'
          : isClerkGrace
            ? 'The shop clerk is holding Immediate Dispatch open a little longer. Order before the extra time ends and we will dispatch this straight away.'
            : immediateDispatchHoursMessage(deliveryWindow);

  return (
    <div style={{ padding: '2.5rem 0 6rem 0' }}>
      <div className="container">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '3rem',
          flexWrap: 'wrap'
        }}>
          <Link to={rewardsMode ? rewardsReturnPath : '/cart'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--accent-gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
            <span>{rewardsMode ? '1. Loyalty Shop' : '1. Shopping Cart'}</span>
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>2</span>
            <span>Customer Details & Shipping</span>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>3</span>
            <span>Secure Payment</span>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <Link to={rewardsMode ? rewardsReturnPath : '/cart'} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)', fontSize: '0.9rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
            <ChevronLeft size={16} /> {rewardsMode ? 'Return to Loyalty Shop' : 'Return to Cart'}
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2.4rem', color: 'var(--text-primary)', margin: 0 }}>Customer & Delivery Details</h1>
            </div>
            {currentUser && (
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '0.4rem 0.85rem', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} /> Logged in as {currentUser.email} (Auto-filled)
              </div>
            )}
          </div>
        </div>

        <ClosingSoonCountdownBanner />

        {!rewardsMode && <SpendThresholdPromoBar subtotal={subtotal} />}

        <form onSubmit={(e) => e.preventDefault()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <User size={20} style={{ color: 'var(--accent-gold)' }} />
                  Contact Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="text" className="form-control" placeholder="e.g. Oliver Smith" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Email Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="email" className="form-control" placeholder="oliver@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Phone Number <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="tel" className="form-control" placeholder="e.g. 0412 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <MapPin size={20} style={{ color: 'var(--accent-gold)' }} />
                  Delivery Address
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Street Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="text" className="form-control" placeholder="e.g. 123 Collins Street, Suite 4B" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="street-address" required />
                  </div>
                  <div className="checkout-address-fields">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Suburb / City <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input type="text" className="form-control" placeholder="e.g. Sydney" value={suburb} onChange={(e) => setSuburb(e.target.value)} autoComplete="address-level2" required />
                    </div>
                    <div className="checkout-state-postcode-container">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          State <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <select className="form-control" value={stateVal} onChange={(e) => setStateVal(e.target.value)} autoComplete="address-level1" required>
                          {AUSTRALIAN_STATES.map((state) => (
                            <option key={state.code} value={state.code}>{STATE_LABELS[state.code] || state.code}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          Postcode <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input type="text" className="form-control" placeholder="2000" value={postcode} onChange={(e) => setPostcode(e.target.value)} autoComplete="postal-code" inputMode="numeric" required />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Country</label>
                    <input type="text" className="form-control" value={country} readOnly disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>
                  {!stateMatches && postcodeReady && (
                    <p style={{ margin: 0, color: '#dc2626', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      Your address state ({stateVal}) does not match the location selected in the menu ({selectedLocation}).
                    </p>
                  )}
                </div>
              </div>

              <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Truck size={20} style={{ color: 'var(--accent-gold)' }} />
                  Delivery Method
                </h3>
                <p style={{ margin: '0 0 1.1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Choose how this order should leave us. Pricing and timing for today are shown here.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{
                    border: `1px solid ${deliveryMethod === 'immediate' ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    padding: '0.95rem 1rem',
                    backgroundColor: immediateAvailable ? 'transparent' : 'rgba(0,0,0,0.02)',
                    opacity: immediateAvailable ? 1 : 0.72
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        id="delivery-immediate"
                        checked={deliveryMethod === 'immediate'}
                        disabled={!immediateAvailable}
                        onChange={() => selectMethod('immediate')}
                        style={{ marginTop: '0.25rem', accentColor: 'var(--accent-gold)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <label htmlFor="delivery-immediate" style={{ fontWeight: 700, color: 'var(--text-primary)', cursor: immediateAvailable ? 'pointer' : 'not-allowed' }}>
                            {IMMEDIATE_DISPATCH_NAME}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <strong style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                              {quoteLoading ? '…' : quote ? (isFreeShipping && deliveryMethod === 'immediate' ? 'FREE' : `$${quote.feeAud.toFixed(2)}`) : '—'}
                            </strong>
                            <button
                              type="button"
                              aria-label="About Immediate Dispatch"
                              onClick={() => setOpenInfo(openInfo === 'immediate' ? null : 'immediate')}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}
                            >
                              <Info size={16} />
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: '0.45rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {immediateStatus}
                        </p>
                        {isFreeShipping && quote && (
                          <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#4caf50' }}>
                            Your coupon waives this delivery fee.
                          </p>
                        )}
                        {openInfo === 'immediate' && (
                          <p style={{ margin: '0.65rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                            {DIDI_PARTNER_BLURB}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    border: `1px solid ${deliveryMethod === 'express' ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    padding: '0.95rem 1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        id="delivery-express"
                        checked={deliveryMethod === 'express'}
                        onChange={() => selectMethod('express')}
                        style={{ marginTop: '0.25rem', accentColor: 'var(--accent-gold)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <label htmlFor="delivery-express" style={{ fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            {EXPRESS_DELIVERY_NAME}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <strong style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}>${EXPRESS_DELIVERY_FEE.toFixed(2)}</strong>
                            <button
                              type="button"
                              aria-label="About Express Delivery"
                              onClick={() => setOpenInfo(openInfo === 'express' ? null : 'express')}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}
                            >
                              <Info size={16} />
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: '0.45rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {freeExpressHoursMessage(deliveryWindow)}
                        </p>
                        {openInfo === 'express' && deliveryWindow === 'open' && (
                          <p style={{ margin: '0.65rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                            Flat ${EXPRESS_DELIVERY_FEE.toFixed(2)} AUD, available Australia-wide with courier partners such as StarTrack or AusPost.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div>
              <div className="card" style={{ padding: '1.75rem', border: '1px solid var(--border-color)', position: 'sticky', top: '100px' }}>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                  Order Summary ({summaryCount} items)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.4rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
                  {rewardsMode ? rewardsCart.items.map((item) => (
                    <div key={item.product.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ShoppingBag size={20} style={{ color: 'var(--accent-gold)' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h5 style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product.name}
                        </h5>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Qty: {item.quantity} × {resolveProductPointsCost(item.product, loyaltyTier)} pts
                        </span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                        {resolveProductPointsCost(item.product, loyaltyTier) * item.quantity} pts
                      </span>
                    </div>
                  )) : cart.map((item) => (
                    <div key={item.product.id || item.product.slug} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ShoppingBag size={20} style={{ color: 'var(--accent-gold)' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h5 style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product.name}
                        </h5>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Qty: {item.quantity} × ${item.product.price} AUD
                        </span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {!rewardsMode && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Promo / Coupon Code
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={isValidatingCoupon}
                      style={{ textTransform: 'uppercase' }}
                    />
                    <button type="button" onClick={handleApplyCoupon} className="btn btn-secondary btn-sm" disabled={isValidatingCoupon || !couponCode.trim()}>
                      {isValidatingCoupon ? <Loader2 size={14} className="spin" /> : 'Apply'}
                    </button>
                  </div>
                  {appliedCoupons.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {appliedCoupons.map((coupon) => {
                        const minReq = coupon.minSpend ?? coupon.minOrderAmount ?? 0;
                        const met = subtotal >= minReq;
                        const label = coupon.discountType === 'free_shipping'
                          ? 'Waives Immediate Dispatch'
                          : coupon.discountType === 'percentage'
                            ? `${coupon.amount}% off`
                            : `$${coupon.amount} AUD off`;
                        return (
                          <div key={coupon.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', backgroundColor: met ? 'rgba(212, 175, 55, 0.1)' : 'rgba(244, 67, 54, 0.1)', borderRadius: 'var(--radius-sm)', border: `1px solid ${met ? 'var(--border-color)' : 'rgba(244, 67, 54, 0.3)'}`, fontSize: '0.825rem' }}>
                            <span style={{ color: met ? 'var(--accent-gold)' : '#ff5252', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Tag size={12} /> <strong>{coupon.code}</strong> ({label})
                            </span>
                            <button type="button" onClick={() => handleRemoveCoupon(coupon.code)} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {rewardsMode ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Points</span>
                      <span>{rewardsCart.pointsTotal} pts</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)} AUD</span>
                    </div>
                  )}
                  {!rewardsMode && spendPromoDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                      <span>Spend & Save ($400+)</span>
                      <span>-${spendPromoDiscount.toFixed(2)} AUD</span>
                    </div>
                  )}
                  {!rewardsMode && couponDiscountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                      <span>Coupon Discount</span>
                      <span>-${couponDiscountAmount.toFixed(2)} AUD</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', gap: '1rem' }}>
                    <span>{deliveryMethod === 'immediate' ? IMMEDIATE_DISPATCH_NAME : EXPRESS_DELIVERY_NAME}</span>
                    {deliveryMethod === 'immediate' && quoteLoading ? (
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Pricing…</span>
                    ) : shippingFee === 0 ? (
                      <span style={{ color: '#4caf50', fontWeight: 600, flexShrink: 0 }}>FREE ($0.00 AUD)</span>
                    ) : (
                      <span style={{ color: 'var(--accent-gold)', flexShrink: 0 }}>${shippingFee.toFixed(2)} AUD</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    <span>{rewardsMode ? 'Due now' : 'Total'}</span>
                    <span>{rewardsMode ? `$${shippingFee.toFixed(2)} AUD` : `$${totalAmount.toFixed(2)} AUD`}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <AgeVerificationNotice loggedIn={Boolean(currentUser)} ageVerified={userProfile?.ageVerified === true} />
                </div>
                {ageBlockMessage && (
                  <p style={{ color: '#dc2626', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1rem' }}>{ageBlockMessage}</p>
                )}

                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-full"
                  onClick={() => handleContinue(rewardsMode ? 'rewards' : 'checkout')}
                  disabled={verifyingAge || authLoading}
                >
                  {verifyingAge ? 'Verifying age...' : 'Continue to checkout'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.75rem 0 0 0', lineHeight: 1.5 }}>
                  If you are not already age verified, continuing opens a secure age check.
                </p>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.75rem 0 0 0', lineHeight: 1.5 }}>
                  {rewardsMode
                    ? 'Delivery is added on the next step. Online payment is still paused, so the reward order will not be placed yet.'
                    : 'Online payment is temporarily unavailable. Age verification still runs before checkout, but the order will not be placed yet.'}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
