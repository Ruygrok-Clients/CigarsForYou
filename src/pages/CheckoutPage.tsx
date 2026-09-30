import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
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
