import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Handshake, Store, Mail, Phone, Send, CheckCircle2, Building2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../components/Toast';
import { trackEvent } from '../lib/analytics';

const INTEREST_OPTIONS = ['Wholesale', 'Venue stocking', 'Licensed retail', 'Distribution hub', 'Other'] as const;

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem 1rem',
  borderRadius: '10px',
  border: '1px solid rgba(46, 26, 16, 0.2)',
  fontSize: '0.95rem',
  color: '#111827',
  backgroundColor: '#faf6f5',
  outline: 'none'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '0.4rem'
};

const emptyForm = {
  name: '',
  businessName: '',
  email: '',
  phone: '',
  abn: '',
  interest: 'Wholesale' as (typeof INTEREST_OPTIONS)[number],
  message: ''
};

export const PartnershipsPage: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedInterest = searchParams.get('interest');
  const [formData, setFormData] = useState(() => ({
    ...emptyForm,
    interest: (INTEREST_OPTIONS as readonly string[]).includes(requestedInterest || '')
      ? requestedInterest as (typeof INTEREST_OPTIONS)[number]
      : emptyForm.interest
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.businessName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.message.trim()
    ) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'b2bEnquiries'), {
        name: formData.name.trim(),
        businessName: formData.businessName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        abn: formData.abn.trim(),
        interest: formData.interest,
        message: formData.message.trim(),
        createdAt: new Date().toISOString(),
        status: 'new'
      });
      setSubmitted(true);
      trackEvent('b2b_enquiry', { lead_type: 'b2b', interest: formData.interest });
      setFormData(emptyForm);
      showToast('Thank you. Our partnerships team will be in touch shortly.', 'success');
    } catch (err) {
      console.error('Error saving B2B enquiry:', err);
      showToast('We could not send your enquiry. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <style>{`
        .partnerships-hero-section {
          padding: 2rem 1rem 2.5rem 1rem !important;
        }
        .partnerships-page-section {
          padding-top: 1.75rem !important;
          padding-bottom: 2.5rem !important;
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        .partnerships-grid-2col {
          grid-template-columns: 1fr !important;
          gap: 2rem !important;
        }
        .partnerships-card-padding {
          padding: 1.5rem 1.25rem !important;
        }
        .partnerships-form-two-col {
          grid-template-columns: 1fr !important;
        }

        @media (min-width: 769px) {
          .partnerships-hero-section {
            padding: 2.5rem 1.25rem 3.25rem 1.25rem !important;
          }
          .partnerships-page-section {
            padding-top: 2.25rem !important;
            padding-bottom: 3.25rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
          .partnerships-form-two-col {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (min-width: 1110px) {
          .partnerships-hero-section {
            padding: 5rem 1.5rem 5.5rem 1.5rem !important;
          }
          .partnerships-page-section {
            padding: 5rem 1.5rem !important;
          }
          .partnerships-grid-2col {
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)) !important;
            gap: 3.5rem !important;
          }
          .partnerships-card-padding {
            padding: 2.25rem !important;
          }
          .partnerships-grid-2col > .partnerships-card-padding {
            padding: 2.5rem !important;
          }
        }
      `}</style>

      <section className="partnerships-hero-section" style={{
        backgroundColor: '#2f0d0e',
        color: '#ffffff',
        padding: '5rem 1.5rem 5.5rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        borderBottom: '1px solid rgba(192, 101, 23, 0.2)'
      }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 1.15rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(192, 101, 23, 0.15)',
            border: '1px solid rgba(192, 101, 23, 0.4)',
            color: '#e59d5c',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            <Handshake size={15} /> Wholesale & Venue Stocking
          </div>

          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.6rem, 5vw, 4rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '1.25rem'
          }}>
            Partnerships
          </h1>

          <p style={{
            fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)',
            color: '#d1d5db',
            maxWidth: '720px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Stock CigarsForYou in your licensed store or venue. Purchase wholesale and in bulk, then sell our range under your own licence. Partners enquire about the same Cuban houses customers see in the <Link to="/shop" style={{ color: '#e59d5c' }}>cigar catalogue</Link>.
          </p>
        </div>
      </section>

      <section className="partnerships-page-section" style={{ padding: '5rem 1.5rem', backgroundColor: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div className="partnerships-grid-2col" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '3.5rem',
            alignItems: 'start'
          }}>
            <div className="partnerships-card-padding" style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '2.5rem',
              border: '1px solid rgba(46, 26, 16, 0.12)',
              boxShadow: '0 12px 35px rgba(46, 26, 16, 0.06)'
            }}>
              <h2 style={{
                fontSize: '1.75rem',
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                color: '#2f0d0e',
                marginBottom: '0.5rem'
              }}>
                Enquire about wholesale
              </h2>
              <p style={{ fontSize: '0.925rem', color: '#6b7280', marginBottom: '2rem' }}>
                Tell us about your licensed business and the range you want to stock. Our partnerships team will follow up with wholesale options.
              </p>

              {submitted ? (
                <div style={{
                  padding: '2rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#166534'
                }}>
                  <CheckCircle2 size={48} style={{ color: '#16a34a', margin: '0 auto 1rem auto' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Enquiry received</h3>
                  <p style={{ fontSize: '0.95rem', color: '#15803d', lineHeight: 1.6 }}>
                    Thank you for your interest in stocking CigarsForYou. We will review your details and contact you about wholesale supply.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    style={{
                      marginTop: '1.5rem',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '9999px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Send another enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="partnerships-form-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor="partnership-name" style={labelStyle}>Contact name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        id="partnership-name"
                        type="text"
                        required
                        placeholder="e.g. Oliver Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="partnership-business" style={labelStyle}>Business or venue <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        id="partnership-business"
                        type="text"
                        required
                        placeholder="e.g. Harbour Lounge"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        style={fieldStyle}
                      />
                    </div>
                  </div>

                  <div className="partnerships-form-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor="partnership-email" style={labelStyle}>Email address <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        id="partnership-email"
                        type="email"
                        required
                        placeholder="you@venue.com.au"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="partnership-phone" style={labelStyle}>Phone number <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        id="partnership-phone"
                        type="tel"
                        required
                        placeholder="0400 000 000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        style={fieldStyle}
                      />
                    </div>
                  </div>

                  <div className="partnerships-form-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor="partnership-abn" style={labelStyle}>ABN</label>
                      <input
                        id="partnership-abn"
                        type="text"
                        placeholder="00 000 000 000"
                        value={formData.abn}
                        onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="partnership-interest" style={labelStyle}>Interest</label>
                      <select
                        id="partnership-interest"
                        value={formData.interest}
                        onChange={(e) => setFormData({ ...formData, interest: e.target.value as (typeof INTEREST_OPTIONS)[number] })}
                        style={{ ...fieldStyle, cursor: 'pointer' }}
                      >
                        {INTEREST_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="partnership-message" style={labelStyle}>Message <span style={{ color: '#dc2626' }}>*</span></label>
                    <textarea
                      id="partnership-message"
                      required
                      rows={5}
                      placeholder="Tell us about your licence, location, and the range you would like to stock."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      style={{ ...fieldStyle, resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      backgroundColor: '#c06517',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '1rem',
                      padding: '0.9rem 2rem',
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: '0 6px 20px rgba(192, 101, 23, 0.3)',
                      transition: 'all 0.2s ease',
                      marginTop: '0.5rem'
                    }}
                  >
                    {submitting ? 'Sending...' : (
                      <>
                        <Send size={18} /> Send partnership enquiry
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="partnerships-card-padding" style={{
                backgroundColor: '#2f0d0e',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '2.25rem',
                boxShadow: '0 12px 35px rgba(47, 13, 14, 0.15)',
                border: '1px solid rgba(192, 101, 23, 0.3)'
              }}>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: '#ffffff', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Stock our range
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(192, 101, 23, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Store size={20} style={{ color: '#e59d5c' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                        Licensed stores and venues
                      </span>
                      <p style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.5, margin: '0.25rem 0 0' }}>
                        Buy wholesale and in bulk to sell CigarsForYou products in your own licensed store, lounge, bar, or venue.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(192, 101, 23, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building2 size={20} style={{ color: '#e59d5c' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                        Wholesale supply
                      </span>
                      <p style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.5, margin: '0.25rem 0 0' }}>
                        We work with licensed retailers who want a curated cigar range, consistent stock, and a direct partnership with our team.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="partnerships-card-padding" style={{
                backgroundColor: '#2f0d0e',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '2.25rem',
                boxShadow: '0 12px 35px rgba(47, 13, 14, 0.15)',
                border: '1px solid rgba(192, 101, 23, 0.3)'
              }}>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: '#ffffff', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Talk about partnerships
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(192, 101, 23, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Mail size={20} style={{ color: '#e59d5c' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                        Partnerships email
                      </span>
                      <a href="mailto:hello@cigarsforyou.com.au" style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', textDecoration: 'none' }}>
                        hello@cigarsforyou.com.au
                      </a>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(192, 101, 23, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Phone size={20} style={{ color: '#e59d5c' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                        Phone
                      </span>
                      <a href="tel:+61417772595" style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', textDecoration: 'none' }}>
                        +61 417 772 595
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
