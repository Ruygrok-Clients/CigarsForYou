import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useRewardsCart } from '../context/RewardsCartContext';
import { useAuth } from '../context/AuthContext';
import { useLocationSelection } from '../context/LocationContext';
import { useToast } from '../components/Toast';
import { useClosingSoon } from '../context/ClosingSoonContext';
import { ClosingSoonCountdownBanner } from '../components/ClosingSoonCountdownBanner';
import { validateAndFetchCoupon } from '../utils/coupon';
import { AUSTRALIAN_STATES } from '../constants/locations';
import { FREE_EXPRESS_NAME, IMMEDIATE_DISPATCH_NAME, UBER_PARTNER_BLURB } from '../constants/deliveryCopy';
import { estimateImmediateDispatchFee } from '../utils/immediateDispatchFee';
import {
  freeExpressHoursMessage,
  getDeliveryWindow,
  immediateDispatchHoursMessage
} from '../utils/deliveryHours';
import type { DeliveryMethod } from '../types';
import {
  ShoppingBag,
  ShieldAlert,
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
    discountAmount,
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
  const { currentUser, userProfile, loading: authLoading } = useAuth();
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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [openInfo, setOpenInfo] = useState<DeliveryMethod | null>('immediate');
  const [now, setNow] = useState(() => new Date());
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
  const quote = stateMatches && postcodeReady
    ? estimateImmediateDispatchFee({ postcode: postcode.trim(), state: stateVal })
    : null;
  const immediateAvailable = Boolean(quote);
  const { isClerkGrace, isFinalCall } = useClosingSoon();
  const deliveryWindow = getDeliveryWindow(now);

  const quotedFee = quote?.feeAud ?? 0;

  useEffect(() => {
    if (!immediateAvailable && deliveryMethod === 'immediate') {
      setDeliveryMethod('express');
    }
  }, [immediateAvailable, deliveryMethod, setDeliveryMethod]);

  useEffect(() => {
    setImmediateDispatchFee(deliveryMethod === 'immediate' ? quotedFee : 0);
  }, [deliveryMethod, quotedFee, setImmediateDispatchFee]);

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

  const handleContinueRewards = () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !street.trim() || !suburb.trim() || !postcodeReady || !ageConfirmed) {
      showToast('Please complete your details and confirm you are 18 or older.', 'error');
      return;
    }
    if (deliveryMethod === 'immediate' && !immediateAvailable) {
      showToast('Immediate Dispatch is not available for this address.', 'error');
      return;
    }
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

  const immediateStatus = !postcodeReady
    ? 'Enter your street address and a 4-digit postcode to price Immediate Dispatch.'
    : !stateMatches
      ? `This address is in ${stateVal}, but your selected location is ${selectedLocation}. Immediate Dispatch is only available when they match.`
      : !quote
        ? 'Immediate Dispatch is not available for this postcode.'
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
            <span>{rewardsMode ? '1. Rewards Shop' : '1. Shopping Cart'}</span>
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
            <ChevronLeft size={16} /> {rewardsMode ? 'Return to Rewards Shop' : 'Return to Cart'}
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>Delivery Details</span>
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
                              {quote ? (isFreeShipping && deliveryMethod === 'immediate' ? 'FREE' : `$${quote.feeAud.toFixed(2)}`) : '—'}
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
                            {UBER_PARTNER_BLURB}
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
                            {FREE_EXPRESS_NAME}
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <strong style={{ color: '#4caf50', fontSize: '0.95rem' }}>FREE</strong>
                            <button
                              type="button"
                              aria-label="About Free Express Delivery"
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
                            This option is always available and does not add a delivery fee.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{
                padding: '1.5rem',
                backgroundColor: ageConfirmed ? 'rgba(46, 125, 50, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                border: ageConfirmed ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(220, 38, 38, 0.3)'
              }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    id="checkoutAgeCheck"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    style={{ width: '20px', height: '20px', marginTop: '0.15rem', cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
                  />
                  <label htmlFor="checkoutAgeCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <strong style={{ color: ageConfirmed ? '#4caf50' : 'var(--accent-gold)', display: 'block', marginBottom: '0.25rem' }}>
                      Age Verification & Delivery Requirements Confirmation <span style={{ color: '#dc2626' }}>*</span>
                    </strong>
                    I confirm that I am <strong>18 years of age or older</strong> and agree that valid government-issued photo ID must be presented upon delivery.
                  </label>
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
                          Qty: {item.quantity} × {item.product.pointsCost} pts
                        </span>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                        {item.product.pointsCost * item.quantity} pts
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
                  {!rewardsMode && discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                      <span>Coupon Discount</span>
                      <span>-${discountAmount.toFixed(2)} AUD</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', gap: '1rem' }}>
                    <span>{deliveryMethod === 'immediate' ? IMMEDIATE_DISPATCH_NAME : FREE_EXPRESS_NAME}</span>
                    {shippingFee === 0 ? (
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

                <div style={{ padding: '0.75rem', backgroundColor: '#f5f5f7', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)', fontSize: '0.775rem', color: '#86868b', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <ShieldAlert size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <span>Mandatory 18+ photo ID is verified by delivery personnel upon arrival.</span>
                </div>

                {rewardsMode ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-lg btn-full"
                    onClick={handleContinueRewards}
                  >
                    Continue to checkout
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="btn btn-primary btn-lg btn-full"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.55, cursor: 'not-allowed' }}
                  >
                    Payment unavailable
                  </button>
                )}
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.75rem 0 0 0', lineHeight: 1.5 }}>
                  {rewardsMode
                    ? 'Delivery is added on the next step. Online payment is still paused, so the reward order will not be placed yet.'
                    : 'Online payment is temporarily unavailable. You can review these details, but orders cannot be placed right now.'}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
