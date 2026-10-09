import React, { useEffect, useState } from 'react';
import { Droplets, Gift, Package } from 'lucide-react';
import packagingClosed from '../assets/product-packaging/closed.jpeg';
import packagingOpen from '../assets/product-packaging/open.jpeg';

const PACKAGING_IMAGES = [
  {
    src: packagingClosed,
    alt: 'Closed CigarsForYou cedar wooden dispatch box'
  },
  {
    src: packagingOpen,
    alt: 'Open cedar dispatch box with cigars and two-way humidity pack'
  }
] as const;

const SWITCH_INTERVAL_MS = 2500;

export const DispatchPackagingSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PACKAGING_IMAGES.length);
    }, SWITCH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  return (
    <section className="dispatch-packaging-section" style={{
      position: 'relative',
      backgroundColor: '#faf6f5',
      padding: '6rem 0 5rem 0',
      overflow: 'hidden',
      borderTop: '1px solid rgba(46, 26, 16, 0.06)'
    }}>
      <style>{`
        @keyframes packagingReveal {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dispatch-packaging-section {
          padding-top: 3.5rem !important;
          padding-bottom: 3.5rem !important;
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        .dispatch-packaging-grid {
          grid-template-columns: 1fr !important;
          gap: 2.75rem !important;
        }
        .dispatch-packaging-text {
          max-width: 100% !important;
          order: 1;
        }
        .dispatch-packaging-images {
          max-width: 100% !important;
          height: 340px !important;
          order: 2;
        }
        .dispatch-packaging-features {
          grid-template-columns: 1fr !important;
          gap: 1.25rem !important;
        }
        .dispatch-packaging-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.65s ease-in-out;
          pointer-events: none;
        }
        .dispatch-packaging-slide.is-active {
          opacity: 1;
          pointer-events: auto;
        }
        .dispatch-packaging-text > * {
          animation: packagingReveal 0.7s ease-out both;
        }
        .dispatch-packaging-text > *:nth-child(1) { animation-delay: 0.05s; }
        .dispatch-packaging-text > *:nth-child(2) { animation-delay: 0.12s; }
        .dispatch-packaging-text > *:nth-child(3) { animation-delay: 0.18s; }
        .dispatch-packaging-text > *:nth-child(4) { animation-delay: 0.24s; }
        .dispatch-packaging-text > *:nth-child(5) { animation-delay: 0.3s; }
        .dispatch-packaging-text > *:nth-child(6) { animation-delay: 0.36s; }

        @media (min-width: 481px) {
          .dispatch-packaging-images {
            height: 400px !important;
          }
        }

        @media (min-width: 769px) {
          .dispatch-packaging-section {
            padding-top: 4.5rem !important;
            padding-bottom: 4.5rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
          .dispatch-packaging-grid {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr) !important;
            gap: 3.5rem !important;
            align-items: center !important;
          }
          .dispatch-packaging-text {
            max-width: 560px !important;
            order: 1;
          }
          .dispatch-packaging-images {
            max-width: 520px !important;
            height: 480px !important;
            order: 2;
          }
          .dispatch-packaging-features {
            grid-template-columns: 1fr !important;
          }
        }

        @media (min-width: 1110px) {
          .dispatch-packaging-section {
            padding: 6rem 0 5rem 0 !important;
          }
          .dispatch-packaging-grid {
            gap: 4.5rem !important;
          }
          .dispatch-packaging-images {
            height: 520px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dispatch-packaging-slide {
            transition: none !important;
          }
          .dispatch-packaging-text > * {
            animation: none !important;
          }
        }
      `}</style>

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="dispatch-packaging-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
          gap: '4.5rem',
          alignItems: 'center'
        }}>
          {/* Text column */}
          <div className="dispatch-packaging-text" style={{ maxWidth: '560px' }}>
            <span style={{
              display: 'inline-block',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#c06517',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.85rem'
            }}>
              Dispatch Packaging
            </span>

            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.2rem, 4vw, 3rem)',
              color: '#2f0d0e',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '1.35rem'
            }}>
              Cedar when it matters. Humidor-fresh to your door.
            </h2>

            <p style={{
              color: '#5c3537',
              fontSize: '1.05rem',
              lineHeight: 1.7,
              marginBottom: '1.1rem',
              fontWeight: 400
            }}>
              Every cigar order is packed to hold its condition — premium hard cardboard with humidity control as standard, so flavour and moisture stay where they should on the way to you.
            </p>

            <p style={{
              color: '#5c3537',
              fontSize: '1.05rem',
              lineHeight: 1.7,
              marginBottom: '1.75rem',
              fontWeight: 400
            }}>
              Elevated cigar orders move into a solid cedar humidity control box. The wood buffers the journey the way a humidor does — whether the cigars are with you in a couple of hours via Immediate Dispatch, or arriving by Express Shipping.
            </p>

            <div className="dispatch-packaging-features" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '1rem',
              marginBottom: '1.75rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '0.9rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(192, 101, 23, 0.1)',
                  color: '#c06517',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Package size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#2f0d0e', fontSize: '0.98rem', marginBottom: '0.2rem' }}>
                    Cedar for elevated dispatch
                  </div>
                  <div style={{ color: '#8c6062', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Solid cedar boxes when the order calls for them. Everyday cigar orders travel in premium hard cardboard.
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '0.9rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(192, 101, 23, 0.1)',
                  color: '#c06517',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Droplets size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#2f0d0e', fontSize: '0.98rem', marginBottom: '0.2rem' }}>
                    Two-Way Humidity Packs
                  </div>
                  <div style={{ color: '#8c6062', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Included with cardboard and cedar alike, for Immediate Dispatch and Express Shipping.
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '0.9rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(192, 101, 23, 0.1)',
                  color: '#c06517',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Gift size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#2f0d0e', fontSize: '0.98rem', marginBottom: '0.2rem' }}>
                    Humidity care, included
                  </div>
                  <div style={{ color: '#8c6062', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Two-way packs ride with every cigar order. The cedar box is the elevated finish.
                  </div>
                </div>
              </div>
            </div>

            <p style={{
              color: '#5c3537',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              margin: 0,
              padding: '0.95rem 1.1rem',
              backgroundColor: 'rgba(47, 13, 14, 0.04)',
              borderLeft: '3px solid #c06517',
              borderRadius: '0 10px 10px 0'
            }}>
              <span style={{ fontWeight: 600, color: '#2f0d0e' }}>Please note:</span>{' '}
              Cigarettes and accessories ship in standard dispatch packaging. Cedar is reserved for elevated cigar orders.
            </p>
          </div>

          {/* Single image frame — crossfades between closed / open */}
          <div
            className="dispatch-packaging-images"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{
              position: 'relative',
              width: '100%',
              height: '520px',
              maxWidth: '520px',
              margin: '0 auto',
              borderRadius: '22px',
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(47, 13, 14, 0.18)',
              backgroundColor: '#efe6e0',
              cursor: 'default'
            }}
            aria-live="polite"
          >
            {PACKAGING_IMAGES.map((image, index) => (
              <div
                key={image.src}
                className={`dispatch-packaging-slide${index === activeIndex ? ' is-active' : ''}`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
