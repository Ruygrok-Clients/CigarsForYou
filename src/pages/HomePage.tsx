import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { ProductSeparationsSection } from '../components/ProductSeparationsSection';
import { FeaturedProductsShowcase } from '../components/FeaturedProductsShowcase';
import { AboutUsSection } from '../components/AboutUsSection';
import { CIGAR_BRANDS } from '../components/Navbar';
import { Star, Award } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

  // Hero docked widget state
  const [heroCategory, setHeroCategory] = useState('All Categories');
  const [heroBrand, setHeroBrand] = useState('Brands');
  const [skuInput, setSkuInput] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const q = query(collection(db, 'products'), limit(8));
        const snap = await getDocs(q);
        const list: Product[] = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        setFeaturedProducts(list);
      } catch (err) {
        console.error('Error fetching featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleHeroShopNow = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroCategory !== 'All Categories') params.append('category', heroCategory);
    if (heroBrand !== 'Brands') params.append('brand', heroBrand);
    if (skuInput.trim()) params.append('search', skuInput.trim());
    
    const queryString = params.toString();
    navigate(queryString ? `/shop?${queryString}` : '/shop');
  };

  return (
    <div>
      {/* Medicart Hero Section Container */}
      <section style={{ padding: '1.25rem 1.25rem 3.5rem 1.25rem', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
          
          {/* Main Dark Emerald Green Hero Card */}
          <div className="medicart-hero-card">
            
            {/* Grid Content Wrapper */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              alignItems: 'center',
              gap: '2rem',
              padding: '4rem 3.5rem 7.5rem 3.5rem',
              position: 'relative',
              zIndex: 2
            }} className="hero-grid-wrapper">
              
              {/* Left Column: Social Proof, Title, Subtitle, Buttons */}
              <div style={{ maxWidth: '580px' }}>
                
                {/* Social Proof Avatar Group & Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2rem' }}>
                  {/* Overlapping Avatars */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" 
                      alt="User 1" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2.5px solid #063b30', objectFit: 'cover' }}
                    />
                    <img 
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" 
                      alt="User 2" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2.5px solid #063b30', objectFit: 'cover', marginLeft: '-12px' }}
                    />
                    <img 
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" 
                      alt="User 3" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2.5px solid #063b30', objectFit: 'cover', marginLeft: '-12px' }}
                    />
                  </div>

                  {/* Rating Stars & Text */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '2px' }}>
                      <Star size={16} fill="#eab308" color="#eab308" />
                      <Star size={16} fill="#eab308" color="#eab308" />
                      <Star size={16} fill="#eab308" color="#eab308" />
                      <Star size={16} fill="#eab308" color="#eab308" />
                      <Star size={16} color="#eab308" />
                    </div>
                    <span style={{ fontSize: '0.825rem', color: '#ffffff', fontWeight: 600, opacity: 0.95 }}>
                      Trusted by 50,000+ families
                    </span>
                  </div>
                </div>

                {/* Main Hero Title */}
                <h1 style={{
                  fontSize: 'clamp(2.8rem, 5.5vw, 4.4rem)',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.08,
                  letterSpacing: '-0.035em',
                  marginBottom: '1.25rem',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  Healthcare <br />
                  Delivered to Your <br />
                  Doorstep
                </h1>

                {/* Subtitle */}
                <p style={{
                  fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
                  color: 'rgba(255, 255, 255, 0.88)',
                  lineHeight: 1.55,
                  marginBottom: '2.5rem',
                  maxWidth: '480px',
                  fontWeight: 400
                }}>
                  Order medicines, consult doctors online, and get doorstep delivery within 24 hours.
                </p>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <Link to="/shop" className="medicart-hero-pill-primary">
                    Order Medicines
                  </Link>
                  <Link to="/shop" className="medicart-hero-pill-secondary">
                    Upload Prescription
                  </Link>
                </div>

              </div>

              {/* Right Column: Delivery Courier Cutout Image */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                position: 'relative',
                height: '100%',
                minHeight: '380px'
              }} className="hero-image-col">
                <img 
                  src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=80" 
                  alt="Medicart Delivery Courier"
                  style={{
                    maxHeight: '460px',
                    width: 'auto',
                    objectFit: 'cover',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    transform: 'scaleX(-1)' // Mirror for front facing posture
                  }}
                />
              </div>

            </div>

            {/* Bottom Docked White Floating Search Card */}
            <div className="medicart-bottom-dock" style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '2rem',
              right: '2rem',
              zIndex: 10
            }}>
              <form onSubmit={handleHeroShopNow} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', minWidth: '130px' }}>
                  Select a product
                </span>

                <select 
                  className="medicart-select"
                  value={heroCategory}
                  onChange={(e) => setHeroCategory(e.target.value)}
                  style={{ flex: '1 1 140px', minWidth: '140px' }}
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Medicines">Medicines</option>
                  <option value="Cuban Cigars">Cuban Cigars</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Vitamins">Vitamins</option>
                </select>

                <select 
                  className="medicart-select"
                  value={heroBrand}
                  onChange={(e) => setHeroBrand(e.target.value)}
                  style={{ flex: '1 1 140px', minWidth: '140px' }}
                >
                  <option value="Brands">Brands</option>
                  {CIGAR_BRANDS.map(b => (
                    <option key={b.slug} value={b.name}>{b.name}</option>
                  ))}
                </select>

                <span style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500 }}>or</span>

                <input 
                  type="text"
                  placeholder="Enter SKU"
                  className="medicart-input"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  style={{ flex: '1 1 160px', minWidth: '140px' }}
                />

                <button 
                  type="submit"
                  style={{
                    backgroundColor: '#063b30',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    padding: '12px 32px',
                    borderRadius: '9999px',
                    marginLeft: 'auto',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(6, 59, 48, 0.3)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#042a22'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#063b30'}
                >
                  Shop Now
                </button>
              </form>
            </div>

          </div>

        </div>

        {/* Responsive Adjustments for Bottom Dock & Hero Grid */}
        <style>{`
          @media (max-width: 991px) {
            .hero-grid-wrapper {
              padding: 2.5rem 2rem 14rem 2rem !important;
            }
            .hero-image-col {
              display: none !important;
            }
          }
          @media (max-width: 768px) {
            .medicart-bottom-dock {
              position: relative !important;
              bottom: auto !important;
              left: auto !important;
              right: auto !important;
              margin: -4rem 1rem 0 1rem !important;
            }
            .hero-grid-wrapper {
              padding: 2rem 1.5rem 6rem 1.5rem !important;
            }
          }
        `}</style>
      </section>

      {/* Product Separations Section */}
      <ProductSeparationsSection />

      {/* Featured Products Showcase (Light Theme) */}
      <FeaturedProductsShowcase
        products={featuredProducts}
        loading={loading}
        onOpenNotifyModal={(p) => setSelectedNotifyProduct(p)}
      />

      {/* About Us Feature Section */}
      <AboutUsSection />

      {/* Brand Grid Section */}
      <section style={{ padding: '5rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#b8860b', fontSize: '0.825rem', fontWeight: 600 }}>
              World-Renowned Houses
            </span>
            <h2 style={{ fontSize: '2.5rem', color: '#2e1a10', marginTop: '0.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
              Explore Cuban Brands
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1.25rem'
          }}>
            {CIGAR_BRANDS.map(b => (
              <Link
                key={b.slug}
                to={`/shop/${b.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card card-hover" style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  border: '1px solid rgba(46, 26, 16, 0.08)',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 16px rgba(46, 26, 16, 0.04)'
                }}>
                  <Award size={32} style={{ color: '#b8860b', marginBottom: '0.75rem', opacity: 0.9 }} />
                  <h3 style={{ fontSize: '1.15rem', color: '#2e1a10', fontWeight: 600 }}>{b.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#8e7362', marginTop: '0.25rem', display: 'block' }}>View Lineup</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stock Notification Modal */}
      {selectedNotifyProduct && (
        <StockNotificationModal
          product={selectedNotifyProduct}
          onClose={() => setSelectedNotifyProduct(null)}
        />
      )}
    </div>
  );
};
