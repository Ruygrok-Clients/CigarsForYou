import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRewardsCart } from '../context/RewardsCartContext';
import { useToast } from '../components/Toast';
import { placeRewardOrder } from '../services/rewards';
import { EXPRESS_DELIVERY_NAME, IMMEDIATE_DISPATCH_NAME } from '../constants/deliveryCopy';
import {
  clearLoyaltyTierSnapshot,
  normalizeLoyaltyTier,
  rememberLoyaltyTier,
  resolveProductPointsCost
} from '../utils/rewards';
import { toRewardGaItem, trackAddPaymentInfo, trackOnce, trackPurchase } from '../lib/analytics';

const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rewardsMode = searchParams.get('mode') === 'rewards';

  if (!rewardsMode) {
    return <CheckoutUnavailable />;
  }

  return <RewardsCheckout />;
};

const CheckoutUnavailable: React.FC = () => {
  useEffect(() => {
    trackOnce('checkout_unavailable', 'checkout_unavailable_view', { checkout_type: 'paid' });
  }, []);

  return (
    <div style={{ padding: '6rem 0', textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: '520px' }}>
        <ShoppingBag size={56} style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }} />
        <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Checkout unavailable
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
          Online payment is temporarily unavailable. You can keep browsing and update your cart, but orders cannot be placed right now.
        </p>
        <Link to="/cart" className="btn btn-primary btn-lg">
          Back to cart
        </Link>
      </div>
    </div>
  );
};

const RewardsCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const tier = normalizeLoyaltyTier(userProfile?.loyaltyTier);
  const { showToast } = useToast();
  const rewardsCart = useRewardsCart();
  const [placing, setPlacing] = useState(false);
  const draft = rewardsCart.checkoutDraft;
  const deliveryName = rewardsCart.deliveryMethod === 'immediate' ? IMMEDIATE_DISPATCH_NAME : EXPRESS_DELIVERY_NAME;
  const rewardItems = rewardsCart.items.map((item) => toRewardGaItem(item.product, item.quantity));
  const reportedPayment = useRef(false);

  useEffect(() => {
    if (reportedPayment.current || rewardItems.length === 0) return;
    reportedPayment.current = true;
    trackAddPaymentInfo(rewardsCart.shippingFee, 'rewards', rewardItems, undefined, 'rewards');
  }, [rewardItems, rewardsCart.shippingFee]);

  const handlePlace = async () => {
    if (!paymentsEnabled) {
      showToast('Online payment is temporarily unavailable.', 'error');
      return;
    }
    if (!currentUser || !draft) {
      showToast('Go back and confirm your delivery details first.', 'error');
      return;
    }
    setPlacing(true);
    rememberLoyaltyTier(normalizeLoyaltyTier(userProfile?.loyaltyTier));
    try {
      const result = await placeRewardOrder({
        items: rewardsCart.items.map((item) => ({
          rewardProductId: item.product.id || '',
          quantity: item.quantity
        })),
        deliveryMethod: rewardsCart.deliveryMethod,
        deliveryAddress: {
          street: draft.street,
          suburb: draft.suburb,
          state: draft.state,
          postcode: draft.postcode,
          country: draft.country
        },
        customerName: draft.name,
        customerPhone: draft.phone,
        ageConfirmed: draft.ageConfirmed
      });
      trackPurchase({
        transactionId: result.orderNumber || result.orderId,
        value: rewardsCart.shippingFee,
        shipping: rewardsCart.shippingFee,
        items: rewardsCart.items.map((item) => toRewardGaItem(item.product, item.quantity)),
        checkoutType: 'rewards',
        pointsRedeemed: rewardsCart.pointsTotal
      });
      rewardsCart.clearCart();
      await refreshProfile();
      showToast(`Reward order ${result.orderNumber} placed`);
      navigate(`/order-confirmation?orderId=${encodeURIComponent(result.orderId)}&orderNumber=${encodeURIComponent(result.orderNumber)}`);
    } catch (err) {
      clearLoyaltyTierSnapshot();
      console.error('Reward checkout failed:', err);
      const message = err instanceof Error ? err.message : 'Could not place this reward order.';
      showToast(message, 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (rewardsCart.items.length === 0) {
    return (
      <div style={{ padding: '6rem 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '520px' }}>
          <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Rewards checkout is empty</h1>
          <Link to="/account?tab=rewards&panel=shop" className="btn btn-primary btn-lg">Back to loyalty shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '3rem 0 6rem' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        <Link to="/checkout-details?mode=rewards" style={{ display: 'inline-block', color: 'var(--accent-gold)', marginBottom: '1rem', textDecoration: 'none' }}>
          Back to delivery details
        </Link>
        <span className="badge badge-amber" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>Reward Order</span>
        <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>Checkout</h1>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          {rewardsCart.items.map((item) => (
            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.45rem 0', color: 'var(--text-primary)' }}>
              <span>{item.quantity}x {item.product.name}</span>
              <strong>{resolveProductPointsCost(item.product, tier) * item.quantity} pts</strong>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Points</span>
              <strong>{rewardsCart.pointsTotal} pts</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span>{deliveryName}</span>
              <strong>{rewardsCart.shippingFee === 0 ? 'FREE' : `$${rewardsCart.shippingFee.toFixed(2)} AUD`}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.15rem' }}>
              <span>Due now</span>
              <span style={{ color: 'var(--accent-gold)' }}>${rewardsCart.shippingFee.toFixed(2)} AUD</span>
            </div>
          </div>
          {draft && (
            <p style={{ margin: '1rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Deliver to {draft.name}, {draft.street}, {draft.suburb} {draft.state} {draft.postcode}
            </p>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-lg btn-full"
          disabled={!paymentsEnabled || placing || !draft}
          aria-disabled={!paymentsEnabled || placing || !draft}
          onClick={handlePlace}
          style={!paymentsEnabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
        >
          {paymentsEnabled ? (placing ? 'Placing reward order...' : 'Place reward order') : 'Payment unavailable'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
          {paymentsEnabled
            ? 'Points are spent when this reward order is placed. Immediate Dispatch is charged at the quoted rate.'
            : 'Online payment is temporarily unavailable. This reward order, including any Immediate Dispatch fee, will not be placed until checkout is live again.'}
        </p>
      </div>
    </div>
  );
};
