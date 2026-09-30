import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import img1 from '../assets/testimonial-1.png';
import img2 from '../assets/testimonial-2.png';
import img3 from '../assets/testimonial-3.png';
import img4 from '../assets/testimonial-4.png';

interface Testimonial {
  id: number;
  image: string;
  quote: string;
  name: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    image: img1,
    quote: "The freshness and authenticity were immediate. I've ordered cigars online from many suppliers, but the humidor packaging and speed of CigarsForYou is unmatched. It's become a non-negotiable ritual for my weekend routine.",
    name: "Marcus Vance",
    rating: 5
  },
  {
    id: 2,
    image: img2,
    quote: "Finding genuine Cohiba Siglo VI in Australia used to be a challenge until I discovered CigarsForYou. Delivered to my door in Sydney under 2 hours, factory sealed with verifiable Cuban barcodes.",
    name: "Elena Rostova",
    rating: 5
  },
  {
    id: 3,
    image: img3,
    quote: "The recurring humidor delivery feature is brilliant. Every month a curated selection of Montecristo and Partagás arrives in pristine condition with Boveda humidity packs. My humidor is always ready.",
    name: "Julian Thorne",
    rating: 5
  },
  {
    id: 4,
    image: img4,
    quote: "Unbelievable service and genuine luxury presentation. Every vitola smokes smooth with flawless draw and rich complexity. Highly recommend CigarsForYou to anyone who appreciates true craftsmanship.",
    name: "David Sterling",
    rating: 5
  }
];

export const SocialProofSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTestimonial = TESTIMONIALS[currentIndex];

  // Continuous auto-slide timer (5 seconds)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <section style={{
      width: '100vw',
      maxWidth: '100%',
      height: '100vh',
      padding: 0,
      margin: 0,
      backgroundColor: '#18110e',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Images Stack for Smooth Fade Transitions */}
      {TESTIMONIALS.map((t, idx) => (
        <div
          key={t.id}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${t.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: idx === currentIndex ? 1 : 0,
            transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: idx === currentIndex ? 1 : 0
          }}
        />
      ))}

      {/* Left-to-Right Heavy Gradient Overlay for Text Contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(16, 10, 8, 0.94) 0%, rgba(16, 10, 8, 0.85) 50%, rgba(16, 10, 8, 0.25) 100%)',
          zIndex: 2
        }}
      />

      {/* Responsive Styles */}
      <style>{`
        .testimonial-quote-wrapper {
          width: 100% !important;
          max-width: 100% !important;
        }
        @media (min-width: 769px) {
          .testimonial-quote-wrapper {
            width: 85% !important;
            max-width: 100% !important;
          }
        }
        @media (min-width: 993px) {
          .testimonial-quote-wrapper {
            width: 50% !important;
            max-width: 50vw !important;
          }
        }
      `}</style>

      {/* Content Wrapper */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          width: '100%',
          height: '100%',
          padding: '4rem 6vw',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Testimonial Quote & Customer Name (Stretches to 50% width on laptop/desktop view) */}
        <div
          className="testimonial-quote-wrapper"
          style={{
            width: '50%',
            maxWidth: '50vw'
          }}
        >
          <p
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 3.2rem)',
              fontWeight: 400,
              color: '#ffffff',
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
              marginBottom: '2.5rem',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {activeTestimonial.quote}
          </p>

          {/* 5-Star Rating */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '0.85rem' }}>
            {[...Array(activeTestimonial.rating)].map((_, i) => (
              <Star key={i} size={18} fill="#ffffff" color="#ffffff" />
            ))}
          </div>

          {/* Customer Name */}
          <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            {activeTestimonial.name}
          </h4>
        </div>

        {/* Bottom Horizontal Bar Indicators (Positioned at bottom right) */}
        <div style={{
          position: 'absolute',
          bottom: '3rem',
          right: '6vw',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          zIndex: 4
        }}>
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                height: '3px',
                width: idx === currentIndex ? '42px' : '22px',
                backgroundColor: idx === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
