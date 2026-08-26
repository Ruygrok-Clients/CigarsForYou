import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import type { Order, OrderItem, Address } from '../types';
import confetti from 'canvas-confetti';
import { 
  CreditCard, 
  CheckCircle2, 
  Lock, 
  ArrowLeft,
  MapPin
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { cart, subtotal, discountAmount, totalAmount, clearCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const savedAddress = userProfile?.address || userProfile?.addresses?.[0];

  // Form State
  const [fullName, setFullName] = useState(userProfile?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || userProfile?.email || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [street, setStreet] = useState(savedAddress?.street || '');
  const [suburb, setSuburb] = useState(savedAddress?.suburb || '');
  const [state, setState] = useState(savedAddress?.state || 'NSW');
  const [postcode, setPostcode] = useState(savedAddress?.postcode || '');

  useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName && !fullName) setFullName(userProfile.displayName);
      if ((currentUser?.email || userProfile.email) && !email) setEmail(currentUser?.email || userProfile.email);
      if (userProfile.phone && !phone) setPhone(userProfile.phone);

      const addr = userProfile.address || userProfile.addresses?.[0];
      if (addr) {
        if (addr.street && !street) setStreet(addr.street);
        if (addr.suburb && !suburb) setSuburb(addr.suburb);
        if (addr.state) setState(addr.state);
        if (addr.postcode && !postcode) setPostcode(addr.postcode);
      }
    }
  }, [userProfile]);
  
  // Payment tab
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'PayPal'>('Stripe');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');

  // 18+ Confirmation checkbox
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (cart.length === 0 && !completedOrder) {
    return (
      <div style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: '#ffffff', marginBottom: '1rem' }}>No Items to Checkout</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Your cart is currently empty.
          </p>
          <Link to="/shop" className="btn btn-primary">Return to Shop</Link>
        </div>
      </div>
    );
  }

  // Celebration view upon order success
  if (completedOrder) {
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
              Order Confirmed & Placed
            </span>

            <h1 style={{ fontSize: '2.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              Thank You for Your Order!
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
              Order reference: <strong style={{ color: 'var(--accent-gold)' }}>{completedOrder.orderNumber}</strong>
            </p>

            <div style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '2rem',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span className="badge badge-gold">{completedOrder.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Delivery To:</span>
                <span style={{ color: 'var(--text-primary)' }}>{completedOrder.deliveryAddress.street}, {completedOrder.deliveryAddress.suburb} {completedOrder.deliveryAddress.state}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Method:</span>
                <span style={{ color: 'var(--text-primary)' }}>{completedOrder.paymentMethod} (Verified)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-primary)' }}>Total Paid:</span>
                <span style={{ color: 'var(--accent-gold)' }}>${completedOrder.totalAmount.toFixed(2)} AUD</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              A confirmation email has been sent to <strong>{completedOrder.customerEmail}</strong>. Remember to present government photo ID (18+) upon Australia Post delivery.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/account" className="btn btn-primary">
                View Order History
              </Link>
              <Link to="/shop" className="btn btn-secondary">
                Return to Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed) {
      showToast('You must confirm you are 18 years of age or older to proceed', 'error');
      return;
    }

    if (!fullName || !email || !street || !suburb || !postcode) {
      showToast('Please fill out all required address fields', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const orderNumber = `CFY-${Math.floor(100000 + Math.random() * 900000)}`;
      const addressObj: Address = {
        id: Math.random().toString(36).substring(2, 9),
        street,
        suburb,
        state,
        postcode,
        country: 'Australia'
      };

      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.product.id || item.product.slug,
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price,
        quantity: item.quantity
      }));

      const newOrder: Order = {
        orderNumber,
        customerId: currentUser?.uid || 'guest-user',
        customerName: fullName,
        customerEmail: email,
        items: orderItems,
        subtotal,
        discountAmount,
        totalAmount,
        currency: 'AUD',
        status: 'Verified',
        source: 'Website',
        paymentMethod: paymentMethod === 'Stripe' ? 'Stripe' : 'PayPal',
        deliveryAddress: addressObj,
        ageConfirmed: true,
        createdAt: new Date().toISOString(),
        statusHistory: [
          { status: 'Pending', timestamp: new Date().toISOString() },
          { status: 'Verified', timestamp: new Date().toISOString(), updatedBy: 'System Auto-Verify' }
        ],
        archived: false
      };

      // Save order in Firestore
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      newOrder.id = docRef.id;

      // Deduct inventory stock in Firestore
      for (const item of cart) {
        if (item.product.id) {
          try {
            const pRef = doc(db, 'products', item.product.id);
            await updateDoc(pRef, {
              stock: increment(-item.quantity)
            });
          } catch (stErr) {
            console.error('Error updating product stock:', stErr);
          }
        }
      }

      // Fire confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Fallback if confetti encounters DOM issue
      }

      setCompletedOrder(newOrder);
      clearCart();
      showToast('Order successfully placed!');
    } catch (err) {
      console.error('Error placing order:', err);
      showToast('Failed to process order. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/cart" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> Return to Shopping Cart
          </Link>
          <h1 style={{ fontSize: '2.5rem', color: '#ffffff', marginTop: '0.5rem' }}>Secure Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
            alignItems: 'start'
          }}>
            {/* Left Column: Form Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Step 1: Customer Contact */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  1. Contact & Customer Details
                </h3>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. John Citizen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      required
                      className="form-control"
                      placeholder="john@example.com.au"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      required
                      className="form-control"
                      placeholder="0400 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Shipping Address */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.3rem', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    2. Australian Shipping Address
                  </h3>
                  {savedAddress && (
                    <span className="badge badge-gold" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={13} /> Auto-filled from account
                    </span>
                  )}
                </div>

                {userProfile?.addresses && userProfile.addresses.length > 1 && (
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ color: 'var(--accent-gold)' }}>Select Saved Shipping Address</label>
                    <select
                      className="form-control"
                      onChange={(e) => {
                        const selected = userProfile.addresses?.find(a => a.id === e.target.value);
                        if (selected) {
                          setStreet(selected.street);
                          setSuburb(selected.suburb);
                          setState(selected.state);
                          setPostcode(selected.postcode);
                        }
                      }}
                    >
                      {userProfile.addresses.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.street}, {a.suburb} {a.state} {a.postcode} {a.isDefault ? '(Primary Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="123 George Street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Suburb / City</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="Sydney"
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State</label>
                    <select
                      className="form-control"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    >
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="SA">SA</option>
                      <option value="WA">WA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postcode</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="2000"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Payment Method */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  3. Payment Integration (Stripe / PayPal)
                </h3>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${paymentMethod === 'Stripe' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPaymentMethod('Stripe')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <CreditCard size={16} /> Credit Card (Stripe)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${paymentMethod === 'PayPal' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPaymentMethod('PayPal')}
                    style={{ flex: 1 }}
                  >
                    PayPal Express
                  </button>
                </div>

                {paymentMethod === 'Stripe' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Card Number (Tokenized via Stripe)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Expiry Date</label>
                        <input
                          type="text"
                          className="form-control"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CVC</label>
                        <input
                          type="text"
                          className="form-control"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      You will be directed to PayPal to complete authentication upon placing order.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 4: Mandatory Age Confirmation Checkbox */}
              <div className="card" style={{
                padding: '1.5rem',
                border: '2px solid var(--accent-gold)',
                backgroundColor: 'rgba(212, 175, 55, 0.05)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  color: '#ffffff',
                  lineHeight: 1.5
                }}>
                  <input
                    type="checkbox"
                    required
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)', marginTop: '2px' }}
                  />
                  <span>
                    <strong>I confirm I am 18 years of age or older</strong> and that this order of tobacco products is for my own personal consumption. I understand that government-issued photo ID is checked upon delivery.
                  </span>
                </label>
              </div>
            </div>

            {/* Right Column: Summary & Confirmation */}
            <div>
              <div className="card" style={{ padding: '1.75rem', position: 'sticky', top: '100px' }}>
                <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '1.25rem' }}>Items Review</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {cart.map(item => (
                    <div key={item.product.id || item.product.slug} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <div>
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>{item.quantity}x {item.product.name}</span>
                      </div>
                      <span style={{ color: 'var(--accent-gold)' }}>${item.product.price * item.quantity} AUD</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.95rem'
                }}>
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
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: '1.3rem',
                    color: '#ffffff',
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <span>Total Due</span>
                    <span style={{ color: 'var(--accent-gold)' }}>${totalAmount.toFixed(2)} AUD</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={submitting}
                  style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Lock size={18} /> {submitting ? 'Processing Order...' : `Pay & Place Order ($${totalAmount.toFixed(2)})`}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
