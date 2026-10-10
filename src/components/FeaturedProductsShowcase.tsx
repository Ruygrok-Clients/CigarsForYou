import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Flame, CheckCircle2, AlertCircle, Bell, Check } from 'lucide-react';
import type { Product } from '../types';
import { OptionWheel } from './OptionWheel';
import { useCart } from '../context/CartContext';
import { useStockNotify } from '../context/StockNotifyContext';
import { useToast } from './Toast';
import { responsiveImage } from '../lib/responsiveImage';

interface FeaturedProductsShowcaseProps {
  products: Product[];
  loading?: boolean;
  onOpenNotifyModal?: (product: Product) => void;
}

const getDefaultFourthItemIndex = (productList: Product[]): number => {
  if (!productList || productList.length === 0) return 0;
  return productList.length > 3 ? 3 : Math.max(0, productList.length - 1);
};

export const FeaturedProductsShowcase: React.FC<FeaturedProductsShowcaseProps> = ({
  products,
  loading = false,
  onOpenNotifyModal
}) => {
  const displayProducts = products || [];

  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    return getDefaultFourthItemIndex(displayProducts);
  });
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isWatching } = useStockNotify();

  useEffect(() => {
    const activeList = products || [];
    const defaultIdx = getDefaultFourthItemIndex(activeList);
    setSelectedIndex(defaultIdx);
  }, [products]);

  const activeIndex = displayProducts.length === 0
    ? 0
    : Math.min(Math.max(selectedIndex, 0), displayProducts.length - 1);
  const activeProduct = displayProducts[activeIndex];
  const watchingActive = isWatching(activeProduct);
  const activeOutOfStock = !!activeProduct && activeProduct.stock <= 0;

  const wheelItems = displayProducts.map(p => `${p.brand} ${p.name}`);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!activeProduct) return;
    if (activeProduct.stock <= 0) {
      if (watchingActive) {
        showToast("You're already signed up for stock alerts on this product");
        return;
      }
      if (onOpenNotifyModal) onOpenNotifyModal(activeProduct);
      return;
    }
    addToCart(activeProduct, 1);
    showToast(`Added 1x ${activeProduct.brand} ${activeProduct.name} to cart`);
  };

  const getProductDescription = (p: Product) => {
    const copy = (p.shortDescription || p.extendedDescription || '').trim();
    return copy || 'Published catalogue item.';
  };

  if (!loading && displayProducts.length === 0) return null;
  if (loading || !activeProduct) {
    return (
      <section className="featured-products-section">
        <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: '#8e7362' }}>
          Loading humidor inventory...
        </div>
      </section>
    );
  }

  return (
    <section className="featured-products-section">
      <div className="container">
        {/* Section Header with updated name: Featured Products */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <span style={{
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#c06517',
              fontSize: '0.825rem',
              fontWeight: 600
            }}>
              Curated Selection
            </span>
            <h2 style={{
              fontSize: '2.4rem',
              color: '#2f0d0e',
              marginTop: '0.25rem',
              fontWeight: 700,
              letterSpacing: '-0.025em'
            }}>
              Featured Products
            </h2>
          </div>
          <Link to="/shop" className="btn btn-outline" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#2f0d0e',
            borderColor: 'rgba(47, 13, 14, 0.3)',
            backgroundColor: '#ffffff',
            fontWeight: 600
          }}>
            View All Catalog ({displayProducts.length}) <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8e7362' }}>
            Loading humidor inventory...
          </div>
        ) : (
          <>
            {/* Desktop Showcase Layout (Screens >= 1020px: Side-by-side) */}
            <div className="featured-showcase-desktop">
              <div className="featured-showcase-box">
                <div className="featured-showcase-grid">
                  
                  {/* Left Column: Interactive OptionWheel */}
                  <div className="featured-wheel-column">
                    {/* Visual Header Prompt for Wheel */}
                    <div style={{
                      position: 'absolute',
                      top: '14px',
                      left: '16px',
                      right: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      zIndex: 10,
                      pointerEvents: 'none'
                    }}>
                      <span style={{
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#c06517',
                        fontWeight: 700
                      }}>
                        Selector Wheel
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#8c6062', fontWeight: 500 }}>
                        Scroll / Drag
                      </span>
                    </div>

                    {/* Top Fade Gradient */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '70px',
                      background: 'linear-gradient(to bottom, #ffffff 30%, rgba(255,255,255,0))',
                      zIndex: 5,
                      pointerEvents: 'none'
                    }} />

                    {/* Center Selection Indicator Arrow & Bar */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '6px',
                      right: '6px',
                      transform: 'translateY(-50%)',
                      height: '36px',
                      backgroundColor: 'rgba(192, 101, 23, 0.07)',
                      borderLeft: '4px solid #c06517',
                      borderRadius: '6px',
                      zIndex: 1,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '10px'
                    }}>
                      <ChevronRight size={16} style={{ color: '#c06517', opacity: 0.9 }} />
                    </div>

                    {/* OptionWheel Component */}
                    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 3 }}>
                      <OptionWheel
                        items={wheelItems}
                        defaultSelected={activeIndex}
                        onChange={(index) => setSelectedIndex(index)}
                        textColor="#8c6062"
                        activeColor="#2f0d0e"
                        side="left"
                        fontSize={1.45}
                        spacing={1.4}
                        curve={1}
                        tilt={5}
                        blur={1.5}
                        fade={0.3}
                        smoothing={180}
                        inset={28}
                        loop={false}
                        draggable={true}
                      />
                    </div>

                    {/* Bottom Fade Gradient */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '70px',
                      background: 'linear-gradient(to top, #ffffff 30%, rgba(255,255,255,0))',
                      zIndex: 5,
                      pointerEvents: 'none'
                    }} />
                  </div>

                  {/* Right Column: Dynamic Active Selected Product Details */}
                  <div className="featured-product-card">
                    <div>
                      {/* Top Badges */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-gold" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {activeProduct.brand}
                          </span>
                          <span style={{
                            fontSize: '0.78rem',
                            color: '#8e7362',
                            backgroundColor: '#f5f0eb',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {activeProduct.origin || 'Cuban'} Hand-Rolled
                          </span>
                        </div>

                        {activeProduct.stock <= 0 ? (
                          <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertCircle size={12} /> Out of Stock
                          </span>
                        ) : (
                          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <CheckCircle2 size={12} /> In Stock
                          </span>
                        )}
                      </div>

                      {/* Main Product Info & Image Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.75rem',
                        marginBottom: '1.5rem',
                        alignItems: 'center'
                      }}>
                        {/* Product Image Frame */}
                        <div style={{
                          width: '100%',
                          aspectRatio: '4/3',
                          backgroundColor: '#f9f6f3',
                          borderRadius: '8px',
                          border: '1px solid rgba(46, 26, 16, 0.08)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                        }}>
                          {activeProduct.imageUrl ? (
                            <img
                              {...responsiveImage(activeProduct.imageUrl, '(min-width: 900px) 480px, 100vw')}
                              alt={activeProduct.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.4s ease'
                              }}
                            />
                          ) : (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#c06517' }}>
                              <Flame size={54} style={{ opacity: 0.85, marginBottom: '0.5rem' }} />
                              <div style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                color: '#2f0d0e'
                              }}>
                                {activeProduct.brand}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#8e7362' }}>Vuelta Abajo Harvest</span>
                            </div>
                          )}
                        </div>

                        {/* Product Name & Description */}
                        <div>
                          <h3 style={{
                            fontSize: '1.85rem',
                            color: '#2f0d0e',
                            fontWeight: 700,
                            lineHeight: 1.2,
                            marginBottom: '0.5rem',
                            letterSpacing: '-0.02em'
                          }}>
                            {activeProduct.name}
                          </h3>

                          <div style={{
                            fontSize: '1.5rem',
                            color: '#c06517',
                            fontWeight: 700,
                            marginBottom: '1rem'
                          }}>
                            ${activeProduct.price.toFixed(2)} <span style={{ fontSize: '0.85rem', color: '#8c6062', fontWeight: 500 }}>AUD</span>
                          </div>

                          <p style={{
                            color: '#5c3537',
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                            margin: 0
                          }}>
                            {getProductDescription(activeProduct)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Pagination Controls */}
                    <div>
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(47, 13, 14, 0.08)',
                        marginBottom: '1.25rem'
                      }}>
                        <button
                          onClick={handleAddToCart}
                          className="btn btn-primary btn-lg"
                          disabled={activeOutOfStock && watchingActive}
                          style={{
                            backgroundColor: activeOutOfStock && watchingActive
                              ? 'rgba(16, 185, 129, 0.12)'
                              : '#c06517',
                            color: activeOutOfStock && watchingActive ? '#059669' : '#ffffff',
                            border: activeOutOfStock && watchingActive
                              ? '1px solid rgba(16, 185, 129, 0.35)'
                              : undefined,
                            flex: 1,
                            minWidth: '180px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.6rem',
                            cursor: activeOutOfStock && watchingActive ? 'default' : 'pointer',
                            opacity: 1
                          }}
                        >
                          {activeOutOfStock ? (
                            watchingActive ? (
                              <><Check size={18} /> You'll Be Notified</>
                            ) : (
                              <><Bell size={18} /> Notify Me</>
                            )
                          ) : (
                            <><ShoppingBag size={18} /> Add to Cart</>
                          )}
                        </button>

                        <Link
                          to={`/product/${activeProduct.slug || activeProduct.id}`}
                          className="btn btn-outline btn-lg"
                          style={{
                            borderColor: 'rgba(47, 13, 14, 0.25)',
                            color: '#2f0d0e',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          View Details <ChevronRight size={18} />
                        </Link>
                      </div>

                      {/* Direct Item Selector Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#8c6062', fontWeight: 600 }}>
                          Item {activeIndex + 1} of {displayProducts.length}
                        </span>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {displayProducts.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedIndex(i)}
                              aria-label={`Select item ${i + 1}`}
                              style={{
                                width: activeIndex === i ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                backgroundColor: activeIndex === i ? '#c06517' : 'rgba(47, 13, 14, 0.15)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>

            {/* Mobile / Tablet Showcase Layout (Screens < 1020px: Stacked with Compact Wheel) */}
            <div className="featured-showcase-mobile">
              <div className="featured-showcase-box">
                <div className="featured-showcase-grid-mobile">
                  
                  {/* Top Element: Compact Selector Wheel Column (Much Less Tall) */}
                  <div className="featured-wheel-column-mobile">
                    {/* Visual Header Prompt for Wheel */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '12px',
                      right: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      zIndex: 10,
                      pointerEvents: 'none'
                    }}>
                      <span style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#c06517',
                        fontWeight: 700
                      }}>
                        Selector Wheel
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#8c6062', fontWeight: 500 }}>
                        Scroll / Drag
                      </span>
                    </div>

                    {/* Top Fade Gradient */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '42px',
                      background: 'linear-gradient(to bottom, #ffffff 40%, rgba(255,255,255,0))',
                      zIndex: 5,
                      pointerEvents: 'none'
                    }} />

                    {/* Center Selection Indicator Arrow & Bar */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '6px',
                      right: '6px',
                      transform: 'translateY(-50%)',
                      height: '34px',
                      backgroundColor: 'rgba(192, 101, 23, 0.07)',
                      borderLeft: '4px solid #c06517',
                      borderRadius: '6px',
                      zIndex: 1,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '10px'
                    }}>
                      <ChevronRight size={15} style={{ color: '#c06517', opacity: 0.9 }} />
                    </div>

                    {/* Compact OptionWheel Component */}
                    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 3 }}>
                      <OptionWheel
                        items={wheelItems}
                        defaultSelected={activeIndex}
                        onChange={(index) => setSelectedIndex(index)}
                        textColor="#8c6062"
                        activeColor="#2f0d0e"
                        side="left"
                        fontSize={1.2}
                        spacing={1.3}
                        curve={1}
                        tilt={4}
                        blur={1.3}
                        fade={0.3}
                        smoothing={180}
                        inset={20}
                        loop={false}
                        draggable={true}
                      />
                    </div>

                    {/* Bottom Fade Gradient */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '42px',
                      background: 'linear-gradient(to top, #ffffff 40%, rgba(255,255,255,0))',
                      zIndex: 5,
                      pointerEvents: 'none'
                    }} />
                  </div>

                  {/* Bottom Element: Selected Product Details Card */}
                  <div className="featured-product-card-mobile">
                    <div>
                      {/* Top Badges */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-gold" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {activeProduct.brand}
                          </span>
                          <span style={{
                            fontSize: '0.78rem',
                            color: '#8e7362',
                            backgroundColor: '#f5f0eb',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {activeProduct.origin || 'Cuban'} Hand-Rolled
                          </span>
                        </div>

                        {activeProduct.stock <= 0 ? (
                          <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertCircle size={12} /> Out of Stock
                          </span>
                        ) : (
                          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <CheckCircle2 size={12} /> In Stock
                          </span>
                        )}
                      </div>

                      {/* Main Product Info & Image Grid (Stacked or compact side-by-side for tablet/mobile) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '1.25rem',
                        marginBottom: '1.25rem',
                        alignItems: 'center'
                      }}>
                        {/* Product Image Frame */}
                        <div style={{
                          width: '100%',
                          aspectRatio: '16/10',
                          backgroundColor: '#f9f6f3',
                          borderRadius: '8px',
                          border: '1px solid rgba(46, 26, 16, 0.08)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                        }}>
                          {activeProduct.imageUrl ? (
                            <img
                              {...responsiveImage(activeProduct.imageUrl, '(min-width: 900px) 480px, 100vw')}
                              alt={activeProduct.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.4s ease'
                              }}
                            />
                          ) : (
                            <div style={{ textAlign: 'center', padding: '1.25rem', color: '#c06517' }}>
                              <Flame size={44} style={{ opacity: 0.85, marginBottom: '0.35rem' }} />
                              <div style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                color: '#2f0d0e'
                              }}>
                                {activeProduct.brand}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#8e7362' }}>Vuelta Abajo Harvest</span>
                            </div>
                          )}
                        </div>

                        {/* Product Name & Description */}
                        <div>
                          <h3 style={{
                            fontSize: '1.6rem',
                            color: '#2f0d0e',
                            fontWeight: 700,
                            lineHeight: 1.2,
                            marginBottom: '0.4rem',
                            letterSpacing: '-0.02em'
                          }}>
                            {activeProduct.name}
                          </h3>

                          <div style={{
                            fontSize: '1.35rem',
                            color: '#c06517',
                            fontWeight: 700,
                            marginBottom: '0.75rem'
                          }}>
                            ${activeProduct.price.toFixed(2)} <span style={{ fontSize: '0.85rem', color: '#8c6062', fontWeight: 500 }}>AUD</span>
                          </div>

                          <p style={{
                            color: '#5c3537',
                            fontSize: '0.9rem',
                            lineHeight: 1.55,
                            margin: 0
                          }}>
                            {getProductDescription(activeProduct)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Pagination Controls */}
                    <div>
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid rgba(47, 13, 14, 0.08)',
                        marginBottom: '1rem'
                      }}>
                        <button
                          onClick={handleAddToCart}
                          className="btn btn-primary btn-lg"
                          disabled={activeOutOfStock && watchingActive}
                          style={{
                            backgroundColor: activeOutOfStock && watchingActive
                              ? 'rgba(16, 185, 129, 0.12)'
                              : '#c06517',
                            color: activeOutOfStock && watchingActive ? '#059669' : '#ffffff',
                            border: activeOutOfStock && watchingActive
                              ? '1px solid rgba(16, 185, 129, 0.35)'
                              : undefined,
                            flex: 1,
                            minWidth: '150px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            cursor: activeOutOfStock && watchingActive ? 'default' : 'pointer',
                            opacity: 1
                          }}
                        >
                          {activeOutOfStock ? (
                            watchingActive ? (
                              <><Check size={18} /> You'll Be Notified</>
                            ) : (
                              <><Bell size={18} /> Notify Me</>
                            )
                          ) : (
                            <><ShoppingBag size={18} /> Add to Cart</>
                          )}
                        </button>

                        <Link
                          to={`/product/${activeProduct.slug || activeProduct.id}`}
                          className="btn btn-outline btn-lg"
                          style={{
                            borderColor: 'rgba(47, 13, 14, 0.25)',
                            color: '#2f0d0e',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            padding: '0.75rem 1rem'
                          }}
                        >
                          View Details <ChevronRight size={18} />
                        </Link>
                      </div>

                      {/* Direct Item Selector Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#8c6062', fontWeight: 600 }}>
                          Item {activeIndex + 1} of {displayProducts.length}
                        </span>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {displayProducts.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedIndex(i)}
                              aria-label={`Select item ${i + 1}`}
                              style={{
                                width: activeIndex === i ? '24px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                backgroundColor: activeIndex === i ? '#c06517' : 'rgba(47, 13, 14, 0.15)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
