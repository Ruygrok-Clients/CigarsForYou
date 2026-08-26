import React from 'react';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import imgBack from '../assets/05fd9d10afa548fa8e772a76d2068476.jpeg';
import imgFront from '../assets/2d2867b442374a83b28c44c53acb6b29.jpeg';

export const AboutUsSection: React.FC = () => {
  return (
    <section className="about-us-section" style={{
      position: 'relative',
      backgroundColor: '#ffffff',
      padding: '6rem 0 5rem 0',
      overflow: 'hidden',
      borderTop: '1px solid rgba(46, 26, 16, 0.06)',
      borderBottom: '1px solid rgba(46, 26, 16, 0.06)'
    }}>
      {/* Dashed Background Curve SVG */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
        viewBox="0 0 1400 600"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M -100 450 C 250 580 400 380 620 380 C 840 380 950 160 1450 60"
          stroke="#d1d5db"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          fill="none"
          opacity="0.8"
        />
      </svg>

      {/* Truck Icon Riding along the Dashed Curve */}
      <div style={{
        position: 'absolute',
        left: '42%',
        top: '58%',
        transform: 'translate(-50%, -50%) rotate(-4deg)',
        zIndex: 1,
        color: '#9ca3af',
        pointerEvents: 'none'
      }}>
        <Truck size={34} style={{ strokeWidth: 1.5 }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        {/* Main Content Grid: Left Text & Right Image Stack */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
          marginBottom: '5rem'
        }}>
          {/* Left Column Text */}
          <div style={{ maxWidth: '540px' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.4rem, 4vw, 3.2rem)',
              color: '#2f0d0e',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '1.75rem'
            }}>
              About Us
            </h2>

            <p style={{
              color: '#5c3537',
              fontSize: '1.05rem',
              lineHeight: 1.7,
              marginBottom: '1.25rem',
              fontWeight: 400
            }}>
              At CigarsForYou, we believe enjoying a fine cigar is more than a moment—it’s about the craftsmanship, heritage, and rich experiences you savor along the way. Whether you’re seeking rare Cuban vitolas, daily classics, or celebratory smokes, we design our collection around what truly matters to you.
            </p>

            <p style={{
              color: '#5c3537',
              fontSize: '1.05rem',
              lineHeight: 1.7,
              marginBottom: '2.25rem',
              fontWeight: 400
            }}>
              With expert sourcing, guaranteed humidor freshness, and rapid delivery right to your door, we make discovering and savoring premium cigars effortless, inspiring, and unforgettable.
            </p>

            <Link
              to="/shop"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                padding: '0.85rem 2.25rem',
                borderRadius: '9999px',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(234, 88, 12, 0.28)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#c2410c';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 88, 12, 0.38)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ea580c';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(234, 88, 12, 0.28)';
              }}
            >
              More about
            </Link>
          </div>

          {/* Right Column Stacked Images */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '460px',
            maxWidth: '480px',
            margin: '0 auto'
          }}>
            {/* Back Image Card */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '5%',
              width: '72%',
              height: '380px',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              backgroundColor: '#f3f4f6',
              zIndex: 1
            }}>
              <img
                src={imgBack}
                alt="CigarsForYou Craftsmanship"
                decoding="async"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>

            {/* Front Image Card (Tilted with hardware acceleration) */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              right: '0%',
              width: '68%',
              height: '340px',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.22)',
              transform: 'rotate(9deg) translateZ(0)',
              transformOrigin: 'bottom right',
              border: '4px solid #ffffff',
              backgroundColor: '#f3f4f6',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              zIndex: 2
            }}>
              <img
                src={imgFront}
                alt="Premium Cigar Selection"
                decoding="async"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom 4-Column Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem',
          textAlign: 'center',
          paddingTop: '2rem'
        }}>
          <div>
            <div style={{
              fontSize: 'clamp(2.4rem, 3.5vw, 3.2rem)',
              fontFamily: 'var(--font-serif)',
              color: '#111827',
              fontWeight: 700,
              lineHeight: 1.1
            }}>
              10,000<span style={{ color: '#ea580c' }}>+</span>
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              fontWeight: 500,
              marginTop: '0.5rem'
            }}>
              Happy Connoisseurs
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 'clamp(2.4rem, 3.5vw, 3.2rem)',
              fontFamily: 'var(--font-serif)',
              color: '#111827',
              fontWeight: 700,
              lineHeight: 1.1
            }}>
              50<span style={{ color: '#ea580c' }}>+</span>
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              fontWeight: 500,
              marginTop: '0.5rem'
            }}>
              Curated Brands
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 'clamp(2.4rem, 3.5vw, 3.2rem)',
              fontFamily: 'var(--font-serif)',
              color: '#111827',
              fontWeight: 700,
              lineHeight: 1.1
            }}>
              98<span style={{ color: '#ea580c' }}>%</span>
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              fontWeight: 500,
              marginTop: '0.5rem'
            }}>
              Satisfaction Rate
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 'clamp(2.4rem, 3.5vw, 3.2rem)',
              fontFamily: 'var(--font-serif)',
              color: '#111827',
              fontWeight: 700,
              lineHeight: 1.1
            }}>
              15<span style={{ color: '#ea580c' }}>+</span>
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              fontWeight: 500,
              marginTop: '0.5rem'
            }}>
              Years Experience
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
