import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { CIGAR_BRANDS } from '../components/Navbar';
import { ShieldCheck, Clock, Sparkles, Flame, ChevronRight, Award, RefreshCw } from 'lucide-react';
import bgVideo from '../assets/BG-Vid.mov';

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

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

  return (
    <div>
      {/* 100VH Hero Section with Background Video & Transparent 60% Dark Overlay */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        height: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        overflow: 'hidden',
        paddingTop: '5rem'
      }}>
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src="/BG-Vid.mov"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0
          }}
        >
          <source src="/BG-Vid.mov" type="video/quicktime" />
          <source src={bgVideo} type="video/mp4" />
        </video>

        {/* Transparent Dark Overlay (60% Opacity as requested so video behind is clearly visible) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1
        }} />

        {/* Hero Content Overlay */}
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <span className="badge badge-gold" style={{
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              padding: '0.5rem 1.25rem',
              backgroundColor: 'rgba(184, 134, 11, 0.2)',
              color: '#fde68a',
              border: '1px solid rgba(253, 230, 138, 0.4)',
              backdropFilter: 'blur(12px)'
            }}>
              <Sparkles size={15} /> Australia's Premier On-Demand Humidor
            </span>

            <h1 style={{ 
              fontSize: 'clamp(2.8rem, 6.5vw, 4.6rem)', 
              color: '#ffffff', 
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              letterSpacing: '-0.03em',
              fontWeight: 700,
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.7)'
            }}>
              Authentic Cuban Cigars, <br />
              <span style={{
                color: '#f59e0b',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
              }}>Delivered To Your Door.</span>
            </h1>

            <p style={{ 
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)', 
              color: '#f3f4f6', 
              lineHeight: 1.65,
              marginBottom: '2.75rem',
              maxWidth: '700px',
              marginInline: 'auto',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)'
            }}>
              Hand-rolled Cuban classics from Cohiba, Montecristo, and Partagás. Buy one-off or set recurring deliveries on your schedule so your humidor is never empty.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.25rem' }}>
              <Link to="/shop" className="btn btn-primary btn-lg" style={{
                backgroundColor: '#2e1a10',
                color: '#ffffff',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
              }}>
                Explore Cigar Catalog <ChevronRight size={18} />
              </Link>
              <Link to="/cigarettes" className="btn btn-secondary btn-lg" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(16px)',
                color: '#ffffff'
              }}>
                Cigarettes <span className="badge badge-amber" style={{ marginLeft: '0.4rem', backgroundColor: 'rgba(217, 119, 6, 0.3)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.5)' }}>Coming Soon</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Ambient Soft Glow */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(184, 134, 11, 0.12) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />
      </section>

      {/* Category Tiles (Light Theme) */}
      <section style={{ padding: '5rem 0 3rem 0', backgroundColor: '#f9f6f3' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.75rem' }}>
            {/* Tile 1: Cuban Cigars */}
            <Link to="/shop" style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(46, 26, 16, 0.08)',
                borderRadius: '24px',
                padding: '2.5rem 2rem',
                minHeight: '230px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 30px rgba(46, 26, 16, 0.05)'
              }}>
                <div>
                  <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>Available Now</span>
                  <h3 style={{ fontSize: '2rem', color: '#2e1a10', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Cuban Cigars</h3>
                  <p style={{ color: '#5e4233', fontSize: '0.95rem' }}>
                    Authentic Habanos selections in singles, packs, and full boxes of 25.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b8860b', fontWeight: 600 }}>
                  <span>Shop Collection</span> <ChevronRight size={18} />
                </div>
              </div>
            </Link>

            {/* Tile 2: Cigarettes - Coming Soon */}
            <Link to="/cigarettes" style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(46, 26, 16, 0.08)',
                borderRadius: '24px',
                padding: '2.5rem 2rem',
                minHeight: '230px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 30px rgba(46, 26, 16, 0.05)'
              }}>
                <div>
                  <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>Coming Soon</span>
                  <h3 style={{ fontSize: '2rem', color: '#2e1a10', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Cigarettes</h3>
                  <p style={{ color: '#8e7362', fontSize: '0.95rem' }}>
                    Australian compliance compliant retail cigarette brands launching soon for door delivery.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', fontWeight: 600 }}>
                  <span>Notify Me at Launch</span> <ChevronRight size={18} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Showcase (Light Theme) */}
      <section style={{ padding: '4rem 0 5rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', color: '#b8860b', fontSize: '0.825rem', fontWeight: 600 }}>
                Curated Selection
              </span>
              <h2 style={{ fontSize: '2.4rem', color: '#2e1a10', marginTop: '0.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
                Featured Cuban Cigars
              </h2>
            </div>
            <Link to="/shop" className="btn btn-outline">
              View All Cigars ({featuredProducts.length || '60+'})
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8e7362' }}>
              Loading humidor inventory...
            </div>
          ) : (
            <div className="grid-responsive">
              {featuredProducts.slice(0, 8).map(product => (
                <ProductCard 
                  key={product.id || product.slug} 
                  product={product} 
                  onOpenNotifyModal={(p) => setSelectedNotifyProduct(p)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Subscribe & Save Feature Section (Light Theme) */}
      <section style={{
        padding: '5rem 0',
        backgroundColor: '#f9f6f3',
        borderTop: '1px solid rgba(46, 26, 16, 0.08)',
        borderBottom: '1px solid rgba(46, 26, 16, 0.08)'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: '1rem' }}>
                <RefreshCw size={14} /> Subscription Delivery
              </span>
              <h2 style={{ fontSize: '2.5rem', color: '#2e1a10', marginBottom: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
                Never Run Low. <br />
                <span style={{ color: '#b8860b' }}>Automated Humidor Restock.</span>
              </h2>
              <p style={{ color: '#5e4233', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Select your favorite stick or curated collection, pick your schedule (every 2, 4, 6, or 8 weeks), and let CigarsForYou handle the rest. Modify, pause, or cancel anytime from your account portal.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                  <div style={{ backgroundColor: 'rgba(184, 134, 11, 0.1)', color: '#b8860b', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#2e1a10', fontSize: '1rem', margin: 0, fontWeight: 600 }}>Flexible Delivery Cycles</h4>
                    <p style={{ color: '#8e7362', fontSize: '0.85rem', margin: 0 }}>Choose 2, 4, 6, or 8-week recurring schedules.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                  <div style={{ backgroundColor: 'rgba(184, 134, 11, 0.1)', color: '#b8860b', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: '#2e1a10', fontSize: '1rem', margin: 0, fontWeight: 600 }}>Guaranteed Freshness</h4>
                    <p style={{ color: '#8e7362', fontSize: '0.85rem', margin: 0 }}>Each shipment is sealed in humidity-controlled travel pouches.</p>
                  </div>
                </div>
              </div>

              <Link to="/shop" className="btn btn-primary btn-lg">
                Start a Subscription <ChevronRight size={18} />
              </Link>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(46, 26, 16, 0.08)',
              borderRadius: '28px',
              padding: '2.5rem',
              boxShadow: '0 12px 36px rgba(46, 26, 16, 0.06)',
              textAlign: 'center'
            }}>
              <Flame size={48} style={{ color: '#b8860b', margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.75rem', color: '#2e1a10', marginBottom: '0.75rem', fontWeight: 700 }}>
                Curated Cigar Bundles
              </h3>
              <p style={{ color: '#5e4233', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Enjoy hand-picked selections of premium robustos and churchills delivered effortlessly.
              </p>
              <div style={{ padding: '1rem', backgroundColor: '#f9f6f3', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(46, 26, 16, 0.06)' }}>
                <span style={{ fontSize: '0.85rem', color: '#8e7362', display: 'block', marginBottom: '0.25rem' }}>Popular Subscription</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.3rem', color: '#2e1a10', fontWeight: 700 }}>Cohiba Siglo VI — Every 4 Weeks</span>
              </div>
              <Link to="/shop" className="btn btn-outline btn-full">
                Browse Subscription Options
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Grid Section (Light Theme) */}
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
                  borderRadius: '20px',
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
