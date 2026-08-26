import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Flame, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Product } from '../types';
import { OptionWheel } from './OptionWheel';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'cohiba-robustos',
    name: 'Robustos',
    brand: 'Cohiba',
    slug: 'cohiba-robustos',
    price: 127,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'The archetype of the Robusto format. Rich tones of cocoa, cedar, and subtle roasted nuts deliver a full-bodied smoking experience revered worldwide.'
  },
  {
    id: 'partagas-serie-d-4',
    name: 'Serie D No.4',
    brand: 'Partagas',
    slug: 'partagas-serie-d-4',
    price: 62,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'A benchmark Robusto with deep earth, leather, and pepper notes. Renowned for its robust character and consistent draw.'
  },
  {
    id: 'romeo-y-julieta-churchills',
    name: 'Churchills',
    brand: 'Romeo y Julieta',
    slug: 'romeo-y-julieta-churchills',
    price: 89,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'The signature cigar named in honor of Sir Winston Churchill. Smooth aromatic smoke featuring vanilla, oak, and delicate floral notes.'
  },
  {
    id: 'montecristo-no-2',
    name: 'Montecristo No.2',
    brand: 'Montecristo',
    slug: 'montecristo-no-2',
    price: 95,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'The king of torpedoes. Perfectly tapered with a creamy profile of espresso, spice, and natural sweetness.'
  },
  {
    id: 'hoyo-de-monterrey-epicure-2',
    name: 'Epicure No.2',
    brand: 'Hoyo De Monterrey',
    slug: 'hoyo-de-monterrey-epicure-2',
    price: 65,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'Mild to medium-bodied elegance. Silky smooth notes of cream, light cinnamon, and sweet wood.'
  },
  {
    id: 'h-upmann-half-corona',
    name: 'Half Corona',
    brand: 'H. Upmann',
    slug: 'h-upmann-half-corona',
    price: 33,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'Compact yet intensely flavorful. Excellent 20-minute smoke packed with toasted nuts, coffee, and gentle spice.'
  },
  {
    id: 'cohiba-siglo-vi',
    name: 'Siglo VI',
    brand: 'Cohiba',
    slug: 'cohiba-siglo-vi',
    price: 189,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'The crown jewel of the Linea 1492. Generous ring gauge delivering complex layers of honey, cedar, and buttery leather.'
  },
  {
    id: 'partagas-serie-p-2',
    name: 'Serie P No.2',
    brand: 'Partagas',
    slug: 'partagas-serie-p-2',
    price: 72,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigars',
    origin: 'Cuban',
    active: true,
    description: 'A classic Piramide showcasing Partagas spice and rich wood aromas with an exceptionally satisfying draw.'
  }
];

interface FeaturedProductsShowcaseProps {
  products: Product[];
  loading?: boolean;
  onOpenNotifyModal?: (product: Product) => void;
}

export const FeaturedProductsShowcase: React.FC<FeaturedProductsShowcaseProps> = ({
  products,
  loading = false,
  onOpenNotifyModal
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const { addToCart } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const displayProducts = products && products.length > 0 ? products : FALLBACK_PRODUCTS;
  const activeIndex = Math.min(Math.max(selectedIndex, 0), displayProducts.length - 1);
  const activeProduct = displayProducts[activeIndex] || displayProducts[0];

  const wheelItems = displayProducts.map(p => `${p.brand} ${p.name}`);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (activeProduct.stock <= 0) {
      if (onOpenNotifyModal) onOpenNotifyModal(activeProduct);
      return;
    }
    addToCart(activeProduct, 1);
    showToast(`Added 1x ${activeProduct.brand} ${activeProduct.name} to cart`);
  };

  const getProductDescription = (p: Product) => {
    if (p.description && p.description.trim().length > 10) {
      return p.description;
    }
    const match = FALLBACK_PRODUCTS.find(f => f.brand.toLowerCase() === p.brand?.toLowerCase() || f.name.toLowerCase() === p.name?.toLowerCase());
    if (match && match.description) return match.description;
    return `Hand-crafted in Havana with 100% Vuelta Abajo long-filler tobacco leaves. Aged under optimal humidity to deliver rich cedar notes, leather undertones, and a smooth draw.`;
  };

  return (
    <section style={{ padding: '4.5rem 0 5rem 0', backgroundColor: '#ffffff' }}>
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
              color: '#ea580c',
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
            View All Catalog ({displayProducts.length > 8 ? displayProducts.length : '60+'}) <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8e7362' }}>
            Loading humidor inventory...
          </div>
        ) : (
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
                    color: '#ea580c',
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
                  height: isMobile ? '45px' : '70px',
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
                  height: isMobile ? '40px' : '48px',
                  backgroundColor: 'rgba(234, 88, 12, 0.07)',
                  borderLeft: '4px solid #ea580c',
                  borderRadius: '8px',
                  zIndex: 1,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '12px'
                }}>
                  <ChevronRight size={18} style={{ color: '#ea580c', opacity: 0.9 }} />
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
                    fontSize={isMobile ? 1.12 : 1.45}
                    spacing={isMobile ? 1.3 : 1.4}
                    curve={1}
                    tilt={isMobile ? 4 : 5}
                    blur={1.5}
                    fade={0.3}
                    smoothing={180}
                    inset={isMobile ? 16 : 28}
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
                  height: isMobile ? '45px' : '70px',
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
                          src={activeProduct.imageUrl}
                          alt={activeProduct.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease'
                          }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#ea580c' }}>
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
                        color: '#ea580c',
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
                      style={{
                        backgroundColor: '#ea580c',
                        color: '#ffffff',
                        flex: 1,
                        minWidth: '180px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <ShoppingBag size={18} /> Add to Cart
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
                            backgroundColor: activeIndex === i ? '#ea580c' : 'rgba(47, 13, 14, 0.15)',
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
        )}
      </div>
    </section>
  );
};
