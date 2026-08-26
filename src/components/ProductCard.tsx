import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Bell, RefreshCw, Flame } from 'lucide-react';
import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';

interface ProductCardProps {
  product: Product;
  onOpenNotifyModal?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenNotifyModal }) => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const isOutOfStock = product.stock <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) {
      if (onOpenNotifyModal) onOpenNotifyModal(product);
      return;
    }
    addToCart(product, 1);
    showToast(`Added 1x ${product.name} to cart`);
  };

  return (
    <div className="card card-hover" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Stock / Sold Out Badge */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 10
      }}>
        {isOutOfStock ? (
          <span className="badge badge-red">Sold Out</span>
        ) : (
          <span className="badge badge-orange">{product.brand}</span>
        )}
      </div>

      {/* Product Image Box */}
      <Link to={`/product/${product.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          width: '100%',
          aspectRatio: '4/3',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          marginBottom: '1rem',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden'
        }}>
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#ea580c' }}>
              <Flame size={44} style={{ opacity: 0.85, marginBottom: '0.4rem' }} />
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)'
              }}>
                {product.origin || 'Cuban'} Selection
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
          {product.brand}
        </span>

        <Link to={`/product/${product.slug}`} style={{ textDecoration: 'none' }}>
          <h3 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: '0.5rem',
            lineHeight: 1.3
          }}>
            {product.name}
          </h3>
        </Link>

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              ${product.price} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>AUD</span>
            </span>

            {!isOutOfStock && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                In Stock
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: isOutOfStock ? '1fr' : '1fr auto', gap: '0.5rem' }}>
            {isOutOfStock ? (
              <button 
                type="button"
                className="btn btn-secondary btn-sm btn-full"
                onClick={() => onOpenNotifyModal && onOpenNotifyModal(product)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Bell size={14} /> Notify Me
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleQuickAdd}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <ShoppingBag size={14} /> Add to Cart
                </button>
                <Link
                  to={`/product/${product.slug}`}
                  className="btn btn-outline btn-sm"
                  title="Subscribe & Save"
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px' }}
                >
                  <RefreshCw size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
