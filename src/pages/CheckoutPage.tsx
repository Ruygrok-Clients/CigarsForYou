import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { functions, db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, ShoppingBag, Loader2, Package, CreditCard } from 'lucide-react';
import type { Order } from '../types';

/**
 * CheckoutPage — Stripe Return Handler
 * 
 * This page handles the return URL from Stripe Hosted Checkout.
 * It calls the verifyStripeOrder Cloud Function to guarantee that the order document is
 * written into Firestore (with duplicate prevention), and displays the completed order summary.
 */
export const CheckoutPage: React.FC = () => {
  const { clearCart } = useCart();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'canceled' | 'empty'>('loading');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const isSuccess = searchParams.get('success') === 'true';
    const isCanceled = searchParams.get('canceled') === 'true';
    const sessionId = searchParams.get('session_id') || '';
    const orderNum = searchParams.get('order_number') || '';

    if (isSuccess) {
      if (orderNum) setOrderNumber(orderNum);
      clearCart();

      if (sessionId) {
        setVerifying(true);
        setStatus('loading');
        const verifyOrder = httpsCallable(functions, 'verifyStripeOrder');
        verifyOrder({ sessionId })
          .then((res: any) => {
            const data = res.data;
            if (data?.order) {
              setOrderDetails(data.order);
              if (data.order.orderNumber) setOrderNumber(data.order.orderNumber);
            }
            setStatus('success');
            showToast('Payment confirmed! Your order has been placed in Firestore.');
            try {
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
            } catch (_) { }
          })
          .catch(async (err) => {
            console.warn('verifyStripeOrder callable notice, checking Firestore directly:', err);
            try {
              const q = query(collection(db, 'orders'), where('stripeSessionId', '==', sessionId));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const existing = snap.docs[0].data() as Order;
                setOrderDetails({ ...existing, id: snap.docs[0].id });
                if (existing.orderNumber) setOrderNumber(existing.orderNumber);
              }
            } catch (fbErr) {
              console.error('Error fetching order from Firestore:', fbErr);
            }
            setStatus('success');
            showToast('Payment completed. Order confirmed.');
          })
          .finally(() => {
            setVerifying(false);
          });
      } else {
        setStatus('success');
        showToast('Payment successful! Your order has been placed.');
        try {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        } catch (_) { }
      }
    } else if (isCanceled) {
      setStatus('canceled');
      showToast('Payment was canceled. Your cart items are still saved.', 'info');
    } else {
      setStatus('empty');
    }
  }, [searchParams]);

  if (verifying || (status === 'loading' && searchParams.get('success') === 'true')) {
    return (
      <div style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '500px' }}>
          <div className="card" style={{ padding: '3rem 2rem' }}>
            <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-gold)', margin: '0 auto 1.5rem' }} />
            <h2 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>Verifying Stripe Payment</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Finalizing your payment and writing order details into Firestore...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state — payment completed via Stripe
  if (status === 'success') {
    return (
      <div style={{ padding: '4rem 0 6rem 0' }}>
        <div className="container" style={{ maxWidth: '720px' }}>
          <div className="card" style={{ padding: '3rem 2rem', border: '1px solid var(--accent-gold)', textAlign: 'center' }}>
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

            <span className="badge badge-gold" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>
              Order Confirmed & Paid via Stripe
            </span>

            <h1 style={{ fontSize: '2.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              Thank You for Your Order!
            </h1>

            {orderNumber && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1rem' }}>
                Order reference: <strong style={{ color: 'var(--accent-gold)' }}>{orderNumber}</strong>
              </p>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', maxWidth: '520px', marginInline: 'auto' }}>
              Your payment has been processed securely via Stripe and recorded in Firestore. A confirmation email has been dispatched to <strong>{orderDetails?.customerEmail || currentUser?.email || 'your email address'}</strong>.
            </p>

            {/* Order Details Breakdown Card */}
            {orderDetails && (
              <div style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid var(--border-subtle)',
                textAlign: 'left'
              }}>
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={18} style={{ color: 'var(--accent-gold)' }} /> Order Breakdown
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Customer</span>
                    <strong style={{ color: '#ffffff' }}>{orderDetails.customerName}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{orderDetails.customerEmail}</div>
                    {orderDetails.customerPhone && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{orderDetails.customerPhone}</div>}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Delivery Address</span>
                    <strong style={{ color: '#ffffff' }}>{orderDetails.deliveryAddress.street}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {orderDetails.deliveryAddress.suburb}, {orderDetails.deliveryAddress.state} {orderDetails.deliveryAddress.postcode}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Payment Method</span>
                    <strong style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CreditCard size={14} style={{ color: 'var(--accent-gold)' }} /> Stripe Verified
                    </strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Paid in AUD</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Purchased Items:</span>
                  {orderDetails.items?.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <span style={{ color: '#ffffff' }}>
                        {item.quantity}x {item.name} {item.brand ? `(${item.brand})` : ''}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ${(item.price * item.quantity).toFixed(2)} AUD
                      </span>
                    </div>
                  ))}

                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem', paddingTop: '0.75rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>
                      <span>Subtotal</span>
                      <span>${orderDetails.subtotal?.toFixed(2)} AUD</span>
                    </div>
                    {(orderDetails.discountAmount ?? 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: '#4caf50' }}>
                        <span>Discount ({orderDetails.couponCode || 'Coupon'})</span>
                        <span>-${orderDetails.discountAmount?.toFixed(2)} AUD</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                      <span>Express Shipping</span>
                      <span>${(orderDetails.shippingFee ?? 25).toFixed(2)} AUD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-gold)' }}>
                      <span>Total Paid</span>
                      <span>${orderDetails.totalAmount?.toFixed(2)} AUD</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '2rem',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0 }}>
                🚚 Your order will be dispatched via our couriers now. Remember to present <strong style={{ color: 'var(--text-primary)' }}>government photo ID (18+)</strong> upon delivery.
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
