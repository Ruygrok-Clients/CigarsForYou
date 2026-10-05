import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Bell, Flame } from 'lucide-react';
import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';
import { trackSelectItem } from '../lib/analytics';

interface ProductCardProps {
  product: Product;
  onOpenNotifyModal?: (product: Product) => void;
  listId?: string;
  listName?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenNotifyModal, listId, listName }) => {
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

  const handleSelect = () => {
    trackSelectItem(product, listId, listName);
  };

  return (
    <div className="card card-hover" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      border: '1px solid #eae7e0',
      borderRadius: '16px',
      padding: 0,
      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
      transition: 'transform 0.25s ease, box-shadow 0.25s ease'
    }}>
      {/* Product Image Box (Warm Gray/Cream Background matching reference) */}
      <Link to={`/product/${product.slug}`} onClick={handleSelect} style={{ textDecoration: 'none', display: 'block', position: 'relative' }}>
        {/* Stock / Sold Out Badge overlay */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          zIndex: 10
        }}>
          {isOutOfStock ? (
            <span className="badge badge-red" style={{ borderRadius: '6px', fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}>Sold Out</span>
          ) : (
            <span className="badge badge-orange" style={{ borderRadius: '6px', fontSize: '0.7rem', padding: '0.25rem 0.6rem', backgroundColor: 'rgba(192, 101, 23, 0.12)', color: '#c06517' }}>
              {product.brand}
            </span>
          )}
        </div>

        <div style={{
          width: '100%',
          height: '230px',
          backgroundColor: '#f2efe9',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '1.25rem',
          overflow: 'hidden',
          transition: 'background-color 0.2s ease'
        }}>
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                transition: 'transform 0.3s ease'
              }} 
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#c06517' }}>
              <Flame size={48} style={{ opacity: 0.85, marginBottom: '0.4rem' }} />
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#2f0d0e'
              }}>
                {product.brand}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#8c6062' }}>
                {product.origin || 'Premium'} Selection
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Card Content Base Section */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '1.25rem 1.25rem 1.35rem 1.25rem' }}>
        <span style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          color: '#c06517',
          fontWeight: 700,
          marginBottom: '0.35rem'
        }}>
          {product.brand}
        </span>

        <Link to={`/product/${product.slug}`} onClick={handleSelect} style={{ textDecoration: 'none' }}>
          <h3 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#1a1a1a',
            marginBottom: '0.5rem',
            lineHeight: 1.3,
            minHeight: '2.6em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {product.name}
          </h3>
        </Link>

        {product.shortDescription && (
          <p style={{
            fontSize: '0.825rem',
            color: '#515154',
            lineHeight: 1.45,
            marginBottom: '1rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {product.shortDescription}
          </p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f0ede6' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#1a1a1a',
              letterSpacing: '-0.02em'
            }}>
              ${product.price.toFixed(2)} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#8c8c8e' }}>AUD</span>
            </span>

            {!isOutOfStock ? (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                In Stock
              </span>
            ) : (
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#dc2626' }}>
                Out of Stock
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
            {isOutOfStock ? (
              <button 
                type="button"
                className="btn btn-secondary btn-sm btn-full"
                onClick={() => onOpenNotifyModal && onOpenNotifyModal(product)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderRadius: '8px',
                  backgroundColor: '#f5f3ee',
                  borderColor: '#e5e2da',
                  color: '#2f0d0e'
                }}
              >
                <Bell size={14} /> Notify Me
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm btn-full"
                onClick={handleQuickAdd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderRadius: '8px',
                  backgroundColor: '#c06517',
                  color: '#ffffff',
                  boxShadow: '0 2px 10px rgba(192, 101, 23, 0.2)'
                }}
              >
                <ShoppingBag size={14} /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
