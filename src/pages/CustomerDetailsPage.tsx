import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { validateAndFetchCoupon } from '../utils/coupon';
import {
  ShoppingBag,
  Lock,
  ShieldAlert,
  Tag,
  ChevronLeft,
  User,
  MapPin,
  Sparkles,
  Loader2
} from 'lucide-react';

export const CustomerDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    appliedCoupons,
    applyCoupon,
    removeCoupon,
    subtotal,
    discountAmount,
    shippingFee,
    totalAmount,
    isFreeShipping
  } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  // Customer Contact State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Delivery Address State
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [stateVal, setStateVal] = useState('NSW');
  const [postcode, setPostcode] = useState('');
  const [country] = useState('Australia');

  // Coupon & Age Verification State
  const [couponCode, setCouponCode] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Autopopulate fields if user is logged in
  useEffect(() => {
    if (currentUser || userProfile) {
      if (!name) {
        setName(userProfile?.displayName || currentUser?.displayName || '');
      }
      if (!email) {
        setEmail(currentUser?.email || userProfile?.email || '');
      }
      if (!phone && userProfile?.phone) {
        setPhone(userProfile.phone);
      }

      const addr = userProfile?.address || userProfile?.addresses?.[0];
      if (addr) {
        if (!street && addr.street) setStreet(addr.street);
        if (!suburb && addr.suburb) setSuburb(addr.suburb);
        if (addr.state) setStateVal(addr.state);
        if (!postcode && addr.postcode) setPostcode(addr.postcode);
      }
    }
  }, [currentUser, userProfile]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (!email.trim() || !email.includes('@')) errors.email = 'Valid email is required';
    if (!phone.trim()) errors.phone = 'Phone number is required for delivery notification';
    if (!street.trim()) errors.street = 'Street address is required';
    if (!suburb.trim()) errors.suburb = 'Suburb / City is required';
    if (!postcode.trim()) errors.postcode = 'Postcode is required';
    if (!ageConfirmed) errors.ageConfirmed = 'You must confirm you are 18+ and accept photo ID check';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      if (!ageConfirmed) {
        showToast('Please confirm you are 18+ and accept photo ID check upon delivery.', 'error');
      } else {
        showToast('Please fill out all required delivery fields.', 'error');
      }
      return;
    }

    setCheckingOut(true);

    try {
      const deliveryAddress = {
        id: 'cart-checkout',
        street: street.trim(),
        suburb: suburb.trim(),
        state: stateVal,
        postcode: postcode.trim(),
        country: country
      };

      const joinedCodes = appliedCoupons.map(c => c.code).join(', ');

      const createSession = httpsCallable(functions, 'createStripeCheckoutSession');
      const res = await createSession({
        items: cart,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        deliveryAddress,
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount,
        couponCode: joinedCodes,
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
      showToast(err.message || 'Failed to launch Stripe checkout. Please try again.', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div style={{ padding: '2.5rem 0 6rem 0' }}>
      <div className="container">
        {/* Checkout Stepper Progress */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '3rem',
          flexWrap: 'wrap'
        }}>
          <Link to="/cart" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            textDecoration: 'none'
          }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.2)',
              color: 'var(--accent-gold)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>✓</span>
            <span>1. Shopping Cart</span>
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontSize: '0.95rem'
          }}>
            <span style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-gold)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>2</span>
            <span>Customer Details & Shipping</span>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem'
          }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem'
            }}>3</span>
            <span>Secure Payment</span>
          </div>
        </div>

        {/* Page Title & Back Link */}
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/cart" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--accent-gold)',
            fontSize: '0.9rem',
            marginBottom: '0.75rem',
            textDecoration: 'none'
          }}>
            <ChevronLeft size={16} /> Return to Cart
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>Final Checkout Step</span>
              <h1 style={{ fontSize: '2.4rem', color: 'var(--text-primary)', margin: 0 }}>Customer & Delivery Details</h1>
            </div>
            {currentUser && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--accent-gold)',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Sparkles size={14} /> Logged in as {currentUser.email} (Auto-filled)
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleCheckoutSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
            alignItems: 'start'
          }}>
            {/* Left Column — Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* Card 1: Contact Information */}
              <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  color: 'var(--text-primary)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <User size={20} style={{ color: 'var(--accent-gold)' }} />
                  Contact Information
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Full Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Oliver Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                    {formErrors.name && <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.name}</span>}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Email Address (for order confirmation & tracking) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="oliver@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    {formErrors.email && <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.email}</span>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Phone Number (for Express Post SMS updates) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 0412 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      required
                    />
                    {formErrors.phone && <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.phone}</span>}
                  </div>
                </div>
              </div>

              {/* Card 2: Delivery / Shipping Address */}
              <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--bg-surface)' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  color: 'var(--text-primary)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <MapPin size={20} style={{ color: 'var(--accent-gold)' }} />
                  Australia Express Delivery Address
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Street Address */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Street Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 123 Collins Street, Suite 4B"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      autoComplete="street-address"
                      required
                    />
                    {formErrors.street && <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.street}</span>}
                  </div>

                  <div className="checkout-address-fields">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Suburb / City <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Sydney"
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                        autoComplete="address-level2"
                        required
                      />
                      {formErrors.suburb && <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.suburb}</span>}
                    </div>

                    <div className="checkout-state-postcode-container">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          State <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <select
                          className="form-control"
                          value={stateVal}
                          onChange={(e) => setStateVal(e.target.value)}
                          autoComplete="address-level1"
                          required
                        >
                          <option value="NSW">NSW - New South Wales</option>
                          <option value="VIC">VIC - Victoria</option>
                          <option value="QLD">QLD - Queensland</option>
                          <option value="WA">WA - Western Australia</option>
                          <option value="SA">SA - South Australia</option>
                          <option value="TAS">TAS - Tasmania</option>
                          <option value="ACT">ACT - Capital Territory</option>
                          <option value="NT">NT - Northern Territory</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          Postcode <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="2000"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          autoComplete="postal-code"
                          required
                        />
                        {formErrors.postcode && <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>{formErrors.postcode}</span>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Country
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={country}
                      readOnly
                      disabled
                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Age & Legal Verification Checkbox */}
              <div className="card" style={{
                padding: '1.5rem',
                backgroundColor: ageConfirmed ? 'rgba(46, 125, 50, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                border: ageConfirmed ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(220, 38, 38, 0.3)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    id="checkoutAgeCheck"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    style={{
                      width: '20px',
                      height: '20px',
                      marginTop: '0.15rem',
                      cursor: 'pointer',
                      accentColor: 'var(--accent-gold)'
                    }}
                    required
                  />
                  <label htmlFor="checkoutAgeCheck" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <strong style={{ color: ageConfirmed ? '#4caf50' : 'var(--accent-gold)', display: 'block', marginBottom: '0.25rem' }}>
                      Age Verification & Delivery Requirements Confirmation <span style={{ color: '#dc2626' }}>*</span>
                    </strong>
                    I confirm that I am <strong>18 years of age or older</strong> and agree that valid government-issued photo ID must be presented upon Australia Post delivery.
                  </label>
                </div>
                {formErrors.ageConfirmed && (
                  <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>
                    ⚠️ {formErrors.ageConfirmed}
                  </span>
                )}
              </div>

            </div>

            {/* Right Column — Order Summary & Stripe CTA */}
            <div>
              <div className="card" style={{ padding: '1.75rem', border: '1px solid var(--border-color)', position: 'sticky', top: '100px' }}>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                  Order Summary ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)
                </h3>

                {/* Items Mini List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  paddingRight: '0.4rem',
                  marginBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '1.25rem'
                }}>
                  {cart.map((item) => (
                    <div key={item.product.id || item.product.slug} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
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

                {/* Final Coupon Code Section */}
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

                {/* Calculation Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)} AUD</span>
                  </div>

                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                      <span>Coupon Discount</span>
                      <span>-${discountAmount.toFixed(2)} AUD</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Express Australia Delivery</span>
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
                    fontSize: '1.2rem',
                    color: 'var(--text-primary)'
                  }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--text-primary)' }}>${totalAmount.toFixed(2)} AUD</span>
                  </div>
                </div>

                {/* Age & Photo ID Warning Box */}
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f7',
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  fontSize: '0.775rem',
                  color: '#86868b',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <ShieldAlert size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <span>Mandatory 18+ photo ID is verified by delivery personnel upon arrival.</span>
                </div>

                {/* Submit / Proceed to Stripe Checkout Button */}
                <button
                  type="submit"
                  disabled={checkingOut}
                  className="btn btn-primary btn-lg btn-full"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: checkingOut ? 0.7 : 1
                  }}
                >
                  <Lock size={18} />
                  {checkingOut ? 'Redirecting to Stripe...' : `Pay $${totalAmount.toFixed(2)} AUD — Proceed to Checkout`}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', margin: '0.75rem 0 0 0' }}>
                  🔒 Payments are encrypted and processed securely via Stripe.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
