import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { 
  ShoppingBag, 
  RefreshCw, 
  Bell, 
  ShieldCheck, 
  Truck, 
  Flame, 
  ChevronLeft, 
  Clock
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [purchaseType, setPurchaseType] = useState<'one-off' | 'subscribe'>('one-off');
  const [frequencyWeeks, setFrequencyWeeks] = useState<2 | 4 | 6 | 8>(4);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0];
          setProduct({ id: docData.id, ...docData.data() } as Product);
        } else {
          // If not found by slug, attempt fetch by ID
          const qId = query(collection(db, 'products'), where('__name__', '==', slug), limit(1));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            const docData = snapId.docs[0];
            setProduct({ id: docData.id, ...docData.data() } as Product);
          }
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading cigar detail...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2 style={{ color: '#ffffff', marginBottom: '1rem' }}>Cigar Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The requested product could not be located in our humidor catalog.
        </p>
        <Link to="/shop" className="btn btn-primary">
          Return to Shop Catalog
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      setNotifyModalOpen(true);
      return;
    }

    const isSub = purchaseType === 'subscribe';
    addToCart(product, quantity, isSub, isSub ? frequencyWeeks : undefined);
    
    if (isSub) {
      showToast(`Added ${quantity}x ${product.name} (Subscribed every ${frequencyWeeks} wks) to cart!`);
    } else {
      showToast(`Added ${quantity}x ${product.name} to cart!`);
    }
  };

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <ChevronLeft size={16} /> Back to Catalog
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '3.5rem',
          alignItems: 'start'
        }}>
          {/* Left Column: Product Image Frame */}
          <div>
            <div style={{
              width: '100%',
              aspectRatio: '1',
              backgroundColor: '#f5f5f7',
              borderRadius: '24px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)'
            }}>
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '18px' }} 
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#b8860b' }}>
                  <Flame size={72} style={{ opacity: 0.9, marginBottom: '1rem' }} />
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: '#1d1d1f'
                  }}>
                    {product.brand}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#86868b', marginTop: '0.5rem' }}>
                    Authentic {product.origin || 'Cuban'} Tobacco
                  </div>
                </div>
              )}

              {/* Status Badge */}
              <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem' }}>
                {isOutOfStock ? (
                  <span className="badge badge-red" style={{ padding: '0.4rem 0.85rem' }}>Sold Out</span>
                ) : (
                  <span className="badge badge-green" style={{ padding: '0.4rem 0.85rem' }}>In Stock</span>
                )}
              </div>
            </div>

            {/* Trust Badges */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginTop: '1.5rem'
            }}>
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <ShieldCheck size={22} style={{ color: 'var(--accent-gold)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>100% Genuine Habanos Guarantee</span>
              </div>
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Truck size={22} style={{ color: 'var(--accent-gold)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Humidity Sealed Express Delivery</span>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Purchase Options */}
          <div>
            <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>
              {product.brand}
            </span>

            <h1 style={{ fontSize: '2.8rem', color: '#ffffff', marginBottom: '0.75rem' }}>
              {product.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--accent-gold)'
              }}>
                ${product.price}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>AUD (Inc. GST)</span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              {product.description || `The ${product.brand} ${product.name} is a world-class Cuban cigar renowned for its exquisite craftsmanship, rich flavor notes, and smooth draw. Perfect for connoisseurs and collectors alike.`}
            </p>

            {/* Purchase Mode Selector */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>
                Select Purchase Method
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Mode 1: One-Off */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${purchaseType === 'one-off' ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                  backgroundColor: purchaseType === 'one-off' ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="radio"
                      name="purchaseType"
                      checked={purchaseType === 'one-off'}
                      onChange={() => setPurchaseType('one-off')}
                      style={{ accentColor: 'var(--accent-gold)' }}
                    />
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '1rem', display: 'block' }}>One-Off Purchase</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Single delivery to your door</span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>${product.price} AUD</span>
                </label>

                {/* Mode 2: Subscribe & Save */}
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${purchaseType === 'subscribe' ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                  backgroundColor: purchaseType === 'subscribe' ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="radio"
                        name="purchaseType"
                        checked={purchaseType === 'subscribe'}
                        onChange={() => setPurchaseType('subscribe')}
                        style={{ accentColor: 'var(--accent-gold)' }}
                      />
                      <div>
                        <strong style={{ color: '#ffffff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <RefreshCw size={14} style={{ color: 'var(--accent-gold)' }} /> Subscribe & Auto-Deliver
                        </strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Never run out · Modify or cancel anytime</span>
                      </div>
                    </div>
                    <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>Automated</span>
                  </div>

                  {purchaseType === 'subscribe' && (
                    <div style={{
                      marginTop: '0.5rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }} onClick={(e) => e.stopPropagation()}>
                      <Clock size={16} style={{ color: 'var(--accent-gold)' }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Delivery Frequency:</span>
                      <select
                        className="form-control"
                        style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                        value={frequencyWeeks}
                        onChange={(e) => setFrequencyWeeks(Number(e.target.value) as any)}
                      >
                        <option value={2}>Every 2 Weeks</option>
                        <option value={4}>Every 4 Weeks (Popular)</option>
                        <option value={6}>Every 6 Weeks</option>
                        <option value={8}>Every 8 Weeks</option>
                      </select>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Quantity Selector & Action Button */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
              {!isOutOfStock && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)'
                }}>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}
                  >
                    -
                  </button>
                  <span style={{ padding: '0 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                    style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}
                  >
                    +
                  </button>
                </div>
              )}

              <button
                type="button"
                className={`btn ${isOutOfStock ? 'btn-secondary' : 'btn-primary'} btn-lg`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleAddToCart}
              >
                {isOutOfStock ? (
                  <>
                    <Bell size={18} /> Notify Me When In Stock
                  </>
                ) : purchaseType === 'subscribe' ? (
                  <>
                    <RefreshCw size={18} /> Subscribe (${product.price * quantity} AUD / {frequencyWeeks} wks)
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} /> Add To Cart (${product.price * quantity} AUD)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Notification Modal */}
      {notifyModalOpen && (
        <StockNotificationModal
          product={product}
          onClose={() => setNotifyModalOpen(false)}
        />
      )}
    </div>
  );
};
