import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  ShieldCheck, 
  Truck, 
  Flame, 
  Users, 
  Sparkles, 
  ArrowRight,
  Thermometer,
  PackageCheck,
  Clock,
  HeartHandshake,
  BadgeCheck
} from 'lucide-react';

// Assets imported from src/assets
import imgHeritage from '../assets/48bbafef63734dbf941751f394ef7dd4.jpeg';
import imgCultivation from '../assets/34b0b02e8dc448d8b8b4679703650e1e.jpeg';
import imgRolling from '../assets/4b44ad6fafd84656a543c77035a44ca8.jpeg';
import imgAging from '../assets/841f45a741f7478193efe3018718bf4c.jpeg';
import imgVault from '../assets/501fd746774c4ca286bd14f73fbbcbb6.jpeg';
import imgDetails from '../assets/9bd62aed236947c1bda2d99642098137.jpeg';
import imgCtaBg from '../assets/7139d14b8f024b3281257a7ef37b5342.jpeg';

export const AboutUsPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      
      {/* 1. Hero Header Section (Expanded Dark Luxury aesthetic) */}
      <section style={{
        backgroundColor: '#2f0d0e',
        color: '#ffffff',
        padding: '6rem 1.5rem 7rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(192, 101, 23, 0.25)'
      }}>
        {/* Glow circles */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          right: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192, 101, 23, 0.22) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192, 101, 23, 0.12) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ maxWidth: '1140px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.35rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(192, 101, 23, 0.18)',
            border: '1px solid rgba(192, 101, 23, 0.45)',
            color: '#e59d5c',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            <Sparkles size={16} /> Authentic Cuban Heritage & Sourcing Excellence
          </div>

          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(3rem, 5.5vw, 4.8rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#ffffff',
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em'
          }}>
            About CigarsForYou
          </h1>

          <p style={{
            fontSize: 'clamp(1.15rem, 2.2vw, 1.35rem)',
            color: '#e5e7eb',
            maxWidth: '840px',
            margin: '0 auto 3rem auto',
            lineHeight: 1.65,
            fontWeight: 400
          }}>
            Australia's leading online sanctuary for hand-rolled Cuban vitolas, climate-controlled vault storage, and white-glove express courier delivery.
          </p>

          {/* Key Stat Badges Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '2rem',
            maxWidth: '960px',
            margin: '0 auto',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c06517', fontFamily: 'var(--font-serif)' }}>1,000+</div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500, marginTop: '0.2rem' }}>Happy Connoisseurs</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c06517', fontFamily: 'var(--font-serif)' }}>10+</div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500, marginTop: '0.2rem' }}>Curated Brands</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c06517', fontFamily: 'var(--font-serif)' }}>1-3hrs</div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500, marginTop: '0.2rem' }}>Expected Delivery</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c06517', fontFamily: 'var(--font-serif)' }}>100%</div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 500, marginTop: '0.2rem' }}>Genuine Habanos Provenance</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Our Origin & Story Section (Big Side-by-Side with Hero Image) */}
      <section style={{ padding: '6.5rem 1.5rem', backgroundColor: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '1240px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '5rem',
            alignItems: 'center'
          }}>
            {/* Left Narrative Text */}
            <div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#c06517',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '0.75rem',
                display: 'block'
              }}>
                Our Heritage & Origins
              </span>

              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
                color: '#2f0d0e',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: '1.75rem',
                letterSpacing: '-0.02em'
              }}>
                Connecting Connoisseurs with the Heart of Havana
              </h2>

              <p style={{ fontSize: '1.075rem', color: '#4b5563', lineHeight: 1.8, marginBottom: '1.25rem' }}>
                Founded in Sydney, CigarsForYou was born from a singular passion: elevating the Australian cigar purchasing experience to the level of luxury, care, and authenticity that world-class cigars deserve.
              </p>

              <p style={{ fontSize: '1.075rem', color: '#4b5563', lineHeight: 1.8, marginBottom: '1.25rem' }}>
                Every Cuban cigar in our humidor vault represents the culmination of centuries of Cuban agricultural heritage—harvested in the legendary fertile valleys of Vuelta Abajo in Pinar del Río, meticulously aged, and rolled by master <em>Torcedores</em> in Havana's historical factories.
              </p>

              <p style={{ fontSize: '1.075rem', color: '#4b5563', lineHeight: 1.8, marginBottom: '2.25rem' }}>
                Whether you are seeking rare Limited Edition vitolas, daily classic Robustos like the Montecristo No.4, or celebratory Cohiba Siglo VI sticks, we curate every box with unyielding standards.
              </p>

              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                <Link
                  to="/shop"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    backgroundColor: '#c06517',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.95rem 2.25rem',
                    borderRadius: '9999px',
                    textDecoration: 'none',
                    boxShadow: '0 6px 20px rgba(192, 101, 23, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Explore Cigars <ArrowRight size={17} />
                </Link>
                <Link
                  to="/contact"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    backgroundColor: 'transparent',
                    color: '#2f0d0e',
                    fontWeight: 700,
                    padding: '0.95rem 2.25rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(47, 13, 14, 0.2)',
                    textDecoration: 'none'
                  }}
                >
                  Speak with a Sommelier
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Image Asset Showcase */}
            <div style={{ position: 'relative' }}>
              <div style={{
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(47, 13, 14, 0.18)',
                border: '1px solid rgba(46, 26, 16, 0.1)',
                position: 'relative'
              }}>
                <img
                  src={imgHeritage}
                  alt="CigarsForYou Heritage and Cuban Cigars"
                  style={{ width: '100%', height: '520px', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(47, 13, 14, 0.75) 0%, transparent 60%)'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '2rem',
                  left: '2rem',
                  right: '2rem',
                  color: '#ffffff'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#e59d5c',
                    marginBottom: '0.25rem'
                  }}>
                    Vuelta Abajo · Pinar Del Río
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-serif)' }}>
                    Handcrafted Tradition in Every Leaf
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 3 Steps of Craftsmanship (Visual 3-Card Photo Grid) */}
      <section style={{ backgroundColor: '#faf6f5', padding: '6.5rem 1.5rem', borderTop: '1px solid rgba(46, 26, 16, 0.08)' }}>
        <div className="container" style={{ maxWidth: '1240px' }}>
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 4.5rem auto' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#c06517', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Mastery from Seed to Smoke
            </span>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.4rem, 4vw, 3.2rem)',
              color: '#2f0d0e',
              fontWeight: 800,
              marginTop: '0.5rem',
              marginBottom: '1rem'
            }}>
              The Art of Cuban Cigar Creation
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Over 500 manual operations take place before a premium Cuban cigar reaches your hands. Explore the three fundamental stages of perfection.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem'
          }}>
            {/* Card 1: Cultivation & Fermentation */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(46, 26, 16, 0.08)'
            }}>
              <div style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                <img
                  src={imgCultivation}
                  alt="Tobacco Cultivation & Fermentation"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  backgroundColor: '#2f0d0e',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em'
                }}>
                  STAGE 01
                </span>
              </div>
              <div style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2f0d0e', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)' }}>
                  Cultivation & Curing
                </h3>
                <p style={{ fontSize: '0.975rem', color: '#6b7280', lineHeight: 1.65 }}>
                  Tobacco leaves are sun-cured in traditional wooden barns (<em>Casas de Tabaco</em>) before undergo month-long natural fermentations to balance nicotine, sugars, and rich aromas.
                </p>
              </div>
            </div>

            {/* Card 2: Torcedor Hand-Rolling */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(46, 26, 16, 0.08)'
            }}>
              <div style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                <img
                  src={imgRolling}
                  alt="Torcedor Hand-Rolling"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  backgroundColor: '#c06517',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em'
                }}>
                  STAGE 02
                </span>
              </div>
              <div style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2f0d0e', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)' }}>
                  Torcedor Hand-Rolling
                </h3>
                <p style={{ fontSize: '0.975rem', color: '#6b7280', lineHeight: 1.65 }}>
                  Master <em>Torcedores Grade 9</em> construct each vitola <em>Totalmente a Mano</em> (totally by hand), blending Volado, Seco, and Ligero leaves for an effortless draw and complex burn.
                </p>
              </div>
            </div>

            {/* Card 3: Aging & Humidity Vault */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(46, 26, 16, 0.08)'
            }}>
              <div style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                <img
                  src={imgAging}
                  alt="Cedar Box Aging & Vault Storage"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  backgroundColor: '#2f0d0e',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em'
                }}>
                  STAGE 03
                </span>
              </div>
              <div style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2f0d0e', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)' }}>
                  Cedar Aging & Vault Storage
                </h3>
                <p style={{ fontSize: '0.975rem', color: '#6b7280', lineHeight: 1.65 }}>
                  Rolled vitolas rest inside Spanish cedar cabinets to harmonize essential oils, before being placed inside our Sydney climate-vault maintained at 65–70% relative humidity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Deep-Dive Section: The Humidor Vault Experience */}
      <section style={{ padding: '6.5rem 1.5rem', backgroundColor: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '1240px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '4.5rem',
            alignItems: 'center'
          }}>
            {/* Left Photo Collage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ borderRadius: '16px', overflow: 'hidden', height: '360px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
                <img src={imgVault} alt="Sydney Climate Vault" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ borderRadius: '16px', overflow: 'hidden', height: '360px', marginTop: '2rem', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
                <img src={imgDetails} alt="Cigar Inspection & Quality" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Right Narrative Content */}
            <div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#c06517',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '0.75rem',
                display: 'block'
              }}>
                Uncompromising Quality
              </span>

              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2.2rem, 3.5vw, 3rem)',
                color: '#2f0d0e',
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em'
              }}>
                The CigarsForYou Vault Standards
              </h2>

              <p style={{ fontSize: '1.05rem', color: '#4b5563', lineHeight: 1.75, marginBottom: '1.75rem' }}>
                Unlike general retailers, we do not store cigars in standard warehouse temperatures. Tobacco is an organic, breathing product highly sensitive to temperature and humidity fluctuations.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(192, 101, 23, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Thermometer size={22} style={{ color: '#c06517' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2f0d0e', marginBottom: '0.2rem' }}>
                      Strict 18°C & 68% RH Micro-Climate
                    </h4>
                    <p style={{ fontSize: '0.925rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                      Our Sydney storage vaults are monitored 24/7 with industrial digital hygrometers to eliminate dryness or mold risk.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(192, 101, 23, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <PackageCheck size={22} style={{ color: '#c06517' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2f0d0e', marginBottom: '0.2rem' }}>
                      Boveda® Sealed Travel Protection
                    </h4>
                    <p style={{ fontSize: '0.925rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                      Every single order is dispatched in airtight, foil-shielded Boveda® humidity packs so your sticks arrive in prime smoking condition.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(192, 101, 23, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <BadgeCheck size={22} style={{ color: '#c06517' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2f0d0e', marginBottom: '0.2rem' }}>
                      Habanos Barcode Verification
                    </h4>
                    <p style={{ fontSize: '0.925rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                      We guarantee zero counterfeit product. Every box includes official factory micro-stamps and official origin seals.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                to="/shop"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#c06517',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none'
                }}
              >
                Browse Our Verified Catalog <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Our 6 Core Commitments Grid */}
      <section style={{ backgroundColor: '#2f0d0e', color: '#ffffff', padding: '6.5rem 1.5rem' }}>
        <div className="container" style={{ maxWidth: '1240px' }}>
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 4.5rem auto' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e59d5c', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              The CigarsForYou Promise
            </span>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.4rem, 4vw, 3.2rem)',
              color: '#ffffff',
              fontWeight: 800,
              marginTop: '0.5rem',
              marginBottom: '1rem'
            }}>
              Built for Australian Aficionados
            </h2>
            <p style={{ color: '#d1d5db', fontSize: '1.1rem', lineHeight: 1.6 }}>
              We set the standard for premium tobacco retail, offering unprecedented convenience, authenticity, and express speed.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem'
          }}>
            {/* Commitment 1 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2.25rem 1.75rem',
              border: '1px solid rgba(192, 101, 23, 0.25)'
            }}>
              <Award size={32} style={{ color: '#c06517', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                100% Genuine Provenance
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#9ca3af', lineHeight: 1.6 }}>
                Direct factory sourcing guarantees authentic Cohiba, Montecristo, Partagás, and Hoyo de Monterrey vitolas without middleman risk.
              </p>
            </div>

            {/* Commitment 2 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2.25rem 1.75rem',
              border: '1px solid rgba(192, 101, 23, 0.25)'
            }}>
              <Truck size={32} style={{ color: '#c06517', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                1–3 Hour NSW Express Courier
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#9ca3af', lineHeight: 1.6 }}>
                Need cigars for tonight's celebration? We offer ultra-fast 1-3 hour express hand-delivery across Sydney and NSW metropolitan zones.
              </p>
            </div>

            {/* Commitment 3 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2.25rem 1.75rem',
              border: '1px solid rgba(192, 101, 23, 0.25)'
            }}>
              <ShieldCheck size={32} style={{ color: '#c06517', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                Boveda® Shielded Shipping
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#9ca3af', lineHeight: 1.6 }}>
                Never receive dry, brittle cigars. Every single order is packed inside 2-way 69% RH humidity pouches for perfect moisture retention.
              </p>
            </div>

            {/* Commitment 4 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2.25rem 1.75rem',
              border: '1px solid rgba(192, 101, 23, 0.25)'
            }}>
              <Flame size={32} style={{ color: '#c06517', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                Personalized Sommelier Guidance
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#9ca3af', lineHeight: 1.6 }}>
                Looking for pairings with aged rum, single malt scotch, or cognac? Our team provides tailored ring gauge and flavor profile advice.
              </p>
            </div>

            {/* Commitment 5 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2.25rem 1.75rem',
              border: '1px solid rgba(192, 101, 23, 0.25)'
            }}>
              <Clock size={32} style={{ color: '#c06517', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                Recurring Humidor Delivery
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#9ca3af', lineHeight: 1.6 }}>
                Set automatic monthly or bi-weekly deliveries so your desktop humidor is always stocked with your favorite cigars without hassle.
              </p>
            </div>

            {/* Commitment 6 */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '2.25rem 1.75rem',
              border: '1px solid rgba(192, 101, 23, 0.25)'
            }}>
              <HeartHandshake size={32} style={{ color: '#c06517', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
                Strict 18+ Age Compliance
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#9ca3af', lineHeight: 1.6 }}>
                We operate with full statutory compliance under Australian tobacco law, verifying photo ID upon delivery to protect youth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Grand Call to Action Banner with Rich Background Image */}
      <section style={{
        position: 'relative',
        padding: '7rem 1.5rem',
        backgroundColor: '#2f0d0e',
        color: '#ffffff',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        <img
          src={imgCtaBg}
          alt="CigarsForYou Background Banner"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.25
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(47, 13, 14, 0.8) 0%, rgba(47, 13, 14, 0.95) 100%)'
        }} />

        <div className="container" style={{ maxWidth: '860px', position: 'relative', zIndex: 2 }}>
          <Users size={44} style={{ color: '#c06517', marginBottom: '1.5rem' }} />
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)',
            fontWeight: 800,
            marginBottom: '1.5rem',
            color: '#ffffff',
            lineHeight: 1.15
          }}>
            Experience Australia's Finest Cigar Selection
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#d1d5db', lineHeight: 1.7, marginBottom: '2.75rem' }}>
            Discover world-renowned houses, rare Cuban releases, and tailored humidor subscriptions delivered straight to your door.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link
              to="/shop"
              style={{
                backgroundColor: '#c06517',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.05rem',
                padding: '1rem 2.5rem',
                borderRadius: '9999px',
                textDecoration: 'none',
                boxShadow: '0 8px 25px rgba(192, 101, 23, 0.4)'
              }}
            >
              Shop Cuban Cigars
            </Link>
            <Link
              to="/contact"
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1.05rem',
                padding: '1rem 2.5rem',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                textDecoration: 'none'
              }}
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
