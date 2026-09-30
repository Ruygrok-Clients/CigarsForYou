import React from 'react';
import { Link } from 'react-router-dom';
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
      {/* Style for Subtle Truck Motion Animations & Responsive Layouts */}
      <style>{`
        @keyframes truckMove {
          0% { transform: translate(570px, 344px) rotate(-2deg); }
          50% { transform: translate(570px, 342.5px) rotate(-1.5deg); }
          100% { transform: translate(570px, 344px) rotate(-2deg); }
        }
        @keyframes speedLineDash {
          0% { stroke-dashoffset: 0; opacity: 0.5; }
          50% { opacity: 0.95; }
          100% { stroke-dashoffset: -12; opacity: 0.5; }
        }
        .truck-motion-group {
          animation: truckMove 1.8s ease-in-out infinite;
        }
        .speed-line-animated {
          animation: speedLineDash 1.2s linear infinite;
        }

        .about-us-svg-desktop {
          display: none !important;
        }
        .about-us-svg-mobile {
          display: block !important;
        }

        .about-us-section {
          padding-top: 1.75rem !important;
          padding-bottom: 3rem !important;
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        .about-us-grid {
          grid-template-columns: 1fr !important;
          gap: 2.5rem !important;
          margin-bottom: 3.5rem !important;
        }
        .about-us-text-col {
          max-width: 100% !important;
        }
        .about-us-images-col {
          max-width: 100% !important;
          height: 320px !important;
        }
        .about-us-stats {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 1.5rem !important;
        }

        @media (min-width: 481px) {
          .about-us-images-col {
            height: 380px !important;
          }
        }

        @media (min-width: 769px) {
          .about-us-svg-desktop {
            display: block !important;
          }
          .about-us-svg-mobile {
            display: none !important;
          }
          .about-us-section {
            padding-top: 2.25rem !important;
            padding-bottom: 3.5rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
          .about-us-grid {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)) !important;
            gap: 4rem !important;
            margin-bottom: 5rem !important;
          }
          .about-us-text-col {
            max-width: 540px !important;
          }
          .about-us-images-col {
            max-width: 480px !important;
            height: 460px !important;
          }
          .about-us-stats {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
            gap: 2rem !important;
          }
        }

        @media (min-width: 1110px) {
          .about-us-section {
            padding: 6rem 0 5rem 0 !important;
          }
        }
      `}</style>

      {/* Dashed Background Curve SVG & Moving Delivery Truck (from 769px) */}
      <svg
        className="about-us-svg-desktop"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
        viewBox="0 0 1400 600"
        fill="none"
        preserveAspectRatio="none"
      >
        {/* Dashed Road Line */}
        <path
          d="M -100 450 C 250 580 400 380 620 380 C 840 380 950 160 1450 60"
          stroke="#d1d5db"
          strokeWidth="2.5"
          strokeDasharray="8 8"
          fill="none"
          opacity="0.85"
        />

        {/* Moving Delivery Truck Group - Wheels rest exactly on Y=380 on the dotted path */}
        <g className="truck-motion-group">
          {/* Motion / Speed Lines behind the truck */}
          <g className="speed-line-animated">
            <line x1="-75" y1="18" x2="-12" y2="18" stroke="#c06517" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            <line x1="-105" y1="26" x2="-22" y2="26" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.75" />
            <line x1="-60" y1="34" x2="-10" y2="34" stroke="#c06517" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            <line x1="-120" y1="18" x2="-85" y2="18" stroke="#c06517" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
          </g>

          {/* Wind / Airflow Swooshes ahead of cab */}
          <path d="M 48 4 C 62 1 76 6 86 12" stroke="#c06517" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
          <line x1="54" y1="32" x2="76" y2="32" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" opacity="0.7" />

          {/* Speed Dust Particles */}
          <circle cx="-16" cy="38" r="2.5" fill="#c06517" opacity="0.85" />
          <circle cx="-30" cy="39" r="1.8" fill="#9ca3af" opacity="0.65" />
          <circle cx="-46" cy="40" r="1.2" fill="#c06517" opacity="0.45" />

          {/* Detailed Delivery Truck Icon - Wheels sitting directly ON the dotted line */}
          <g transform="translate(0, 2) scale(1.65)">
            {/* Truck Cargo Body */}
            <rect x="2" y="5" width="13" height="11" rx="1.5" fill="#2f0d0e" stroke="#2f0d0e" strokeWidth="1" />
            {/* Cab */}
            <path d="M 15 8 H 19 L 22 12 V 16 H 15 Z" fill="#c06517" stroke="#2f0d0e" strokeWidth="1" />
            {/* Cab Window */}
            <path d="M 16 9.5 H 18.5 L 20.5 12 H 16 Z" fill="#ffffff" opacity="0.9" />
            {/* Rear Wheel resting on Y=19 (344 + 2 + 19*1.65 = 377..380px) */}
            <circle cx="6.5" cy="16.5" r="2.8" fill="#2f0d0e" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="6.5" cy="16.5" r="1.2" fill="#c06517" />
            {/* Front Wheel resting on Y=19 */}
            <circle cx="18.5" cy="16.5" r="2.8" fill="#2f0d0e" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="18.5" cy="16.5" r="1.2" fill="#c06517" />
          </g>
        </g>
      </svg>

      {/* Custom Mobile Dashed Background Curve SVG (< 780px - without truck) */}
      <svg
        className="about-us-svg-mobile"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
        viewBox="0 0 500 1000"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M -30 160 C 240 50 480 260 340 500 C 200 740 450 820 540 960"
          stroke="#d1d5db"
          strokeWidth="2.5"
          strokeDasharray="7 7"
          fill="none"
          opacity="0.85"
        />
      </svg>

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        {/* Main Content Grid: Left Text & Right Image Stack */}
        <div className="about-us-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
          marginBottom: '5rem'
        }}>
          {/* Left Column Text */}
          <div className="about-us-text-col" style={{ maxWidth: '540px' }}>
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
              to="/about"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#c06517',
                color: '#ffffff',
                padding: '0.85rem 2.25rem',
                borderRadius: '9999px',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(192, 101, 23, 0.28)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#a2520d';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(192, 101, 23, 0.38)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#c06517';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(192, 101, 23, 0.28)';
              }}
            >
              More about us
            </Link>
          </div>

          {/* Right Column Stacked Images */}
          <div className="about-us-images-col" style={{
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
        <div className="about-us-stats" style={{
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
              1,000<span style={{ color: '#c06517' }}>+</span>
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
              10<span style={{ color: '#c06517' }}>+</span>
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
              98<span style={{ color: '#c06517' }}>%</span>
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
              1-3<span style={{ color: '#c06517' }}>hrs</span>
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              fontWeight: 500,
              marginTop: '0.5rem'
            }}>
              Expected Dispatch
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
