import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Truck, Send, HelpCircle, ChevronDown, CheckCircle2, MessageSquare, ShieldAlert } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../components/Toast';
import { trackEvent } from '../lib/analytics';

export const ContactUsPage: React.FC = () => {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'enquiries'), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject,
        message: formData.message.trim(),
        createdAt: new Date().toISOString(),
        status: 'new'
      });
      setSubmitted(true);
      trackEvent('generate_lead', { lead_type: 'contact', subject: formData.subject });
      showToast('Thank you! Your message has been sent successfully. Our team will contact you shortly.', 'success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: ''
      });
    } catch (err) {
      console.error('Error saving enquiry:', err);
      showToast('We could not send your message. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'How does delivery work?',
      a: 'There are two options. Immediate Dispatch (1-3hrs Delivery): we are an official partner with Didi, they handle all our Immediate Dispatch Deliveries to ensure we bring you the fastest delivery time possible. Express Delivery: priority express with logistics and courier partners such as StarTrack or AusPost.'
    },
    {
      q: 'How is age verification handled upon delivery?',
      a: 'In accordance with Australian federal and state tobacco legislation, all deliveries require an adult aged 18+ to present valid government-issued photo ID (Driver License, Passport, or Proof of Age card) upon hand-off.'
    },
    {
      q: 'How are cigars packaged to maintain humidity during transit?',
      a: <>Every cigar order is packed inside airtight <a href="https://bovedainc.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#c06517' }}>Boveda humidity-sealed pouches</a> maintaining 69% relative humidity, so cigars arrive soft and ready to smoke.</>
    },
    {
      q: 'Do you offer bulk, corporate, or wedding event orders?',
      a: <>Yes. We supply curated cigar selections for weddings, corporate events, and private lounges. Use the form on this page, or enquire through <Link to="/partnerships" style={{ color: '#c06517' }}>wholesale partnerships</Link> for licensed venues.</>
    }
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      {/* Mobile-first layout. 769px restores the mid layout; 1110px restores the full page. */}
      <style>{`
        .contact-hero-section {
          padding: 2rem 1rem 2.5rem 1rem !important;
        }
        .contact-page-section {
          padding-top: 1.75rem !important;
          padding-bottom: 2.5rem !important;
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        .contact-grid-2col {
          grid-template-columns: 1fr !important;
          gap: 2rem !important;
        }
        .contact-card-padding {
          padding: 1.5rem 1.25rem !important;
        }
        .contact-faq-section {
          padding-top: 2rem !important;
          padding-bottom: 2.5rem !important;
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
        .form-two-col {
          grid-template-columns: 1fr !important;
        }

        @media (min-width: 769px) {
          .contact-hero-section {
            padding: 2.5rem 1.25rem 3.25rem 1.25rem !important;
          }
          .contact-page-section {
            padding-top: 2.25rem !important;
            padding-bottom: 3.25rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
          .contact-faq-section {
            padding-top: 2.5rem !important;
            padding-bottom: 3.25rem !important;
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
          }
          .form-two-col {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        @media (min-width: 1110px) {
          .contact-hero-section {
            padding: 5rem 1.5rem 5.5rem 1.5rem !important;
          }
          .contact-page-section {
            padding: 5rem 1.5rem !important;
          }
          .contact-grid-2col {
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)) !important;
            gap: 3.5rem !important;
          }
          .contact-card-padding {
            padding: 2.25rem !important;
          }
          .contact-grid-2col > .contact-card-padding {
            padding: 2.5rem !important;
          }
          .contact-faq-section {
            padding: 5rem 1.5rem 6rem 1.5rem !important;
          }
        }
      `}</style>

      {/* Hero Header */}
      <section className="contact-hero-section" style={{
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
            <MessageSquare size={15} /> We Are Here to Help
          </div>

          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.6rem, 5vw, 4rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '1.25rem'
          }}>
            Contact Our Cigar Specialists
          </h1>

          <p style={{
            fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)',
            color: '#d1d5db',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Have questions about cigar pairing, order tracking, humidor care, or corporate events? Get in touch with our expert team today.
          </p>
        </div>
      </section>

      {/* Main Grid: Form + Contact Info */}
      <section className="contact-page-section" style={{ padding: '5rem 1.5rem', backgroundColor: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div className="contact-grid-2col" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '3.5rem',
            alignItems: 'start'
          }}>

            {/* Left Column: Interactive Contact Form */}
            <div className="contact-card-padding" style={{
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
                Send Us a Message
              </h2>
              <p style={{ fontSize: '0.925rem', color: '#6b7280', marginBottom: '2rem' }}>
                Fill out the form below and a representative will respond within 24 business hours.
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
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Message Received!</h3>
                  <p style={{ fontSize: '0.95rem', color: '#15803d', lineHeight: 1.6 }}>
                    Thank you for reaching out to CigarsForYou. Our concierge team is reviewing your inquiry and will be in touch shortly.
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
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Name Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Oliver Smith"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(46, 26, 16, 0.2)',
                        fontSize: '0.95rem',
                        color: '#111827',
                        backgroundColor: '#faf6f5',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                  </div>

                  {/* Email & Phone Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="form-two-col">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                        Email Address <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.8rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(46, 26, 16, 0.2)',
                          fontSize: '0.95rem',
                          color: '#111827',
                          backgroundColor: '#faf6f5',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="0400 000 000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.8rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(46, 26, 16, 0.2)',
                          fontSize: '0.95rem',
                          color: '#111827',
                          backgroundColor: '#faf6f5',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                      Inquiry Topic
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(46, 26, 16, 0.2)',
                        fontSize: '0.95rem',
                        color: '#111827',
                        backgroundColor: '#faf6f5',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Order Tracking & Delivery">Order Tracking & Delivery</option>
                      <option value="Sommelier & Cigar Selection Advice">Sommelier & Cigar Selection Advice</option>
                      <option value="Bulk, Corporate & Wedding Orders">Bulk, Corporate & Wedding Orders</option>
                      <option value="Humidor & Storage Support">Humidor & Storage Support</option>
                    </select>
                  </div>

                  {/* Message Textarea */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                      Message <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="How can our cigar team assist you?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(46, 26, 16, 0.2)',
                        fontSize: '0.95rem',
                        color: '#111827',
                        backgroundColor: '#faf6f5',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
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
                        <Send size={18} /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Contact Details Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {/* Contact Information Card */}
              <div className="contact-card-padding" style={{
                backgroundColor: '#2f0d0e',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '2.25rem',
                boxShadow: '0 12px 35px rgba(47, 13, 14, 0.15)',
                border: '1px solid rgba(192, 101, 23, 0.3)'
              }}>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: '#ffffff', fontWeight: 700, marginBottom: '1.5rem' }}>
                  Direct Channels
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Email */}
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
                        Customer Support Email
                      </span>
                      <a href="mailto:hello@cigarsforyou.com.au" style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', textDecoration: 'none' }}>
                        hello@cigarsforyou.com.au
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
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
                        Toll-Free Phone Line
                      </span>
                      <a href="tel:1300244277" style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', textDecoration: 'none' }}>
                        1300 CIGARS (1300 244 277)
                      </a>
                    </div>
                  </div>

                  {/* Delivery methods */}
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
                      <Truck size={20} style={{ color: '#e59d5c' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                        Delivery
                      </span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                        Immediate Dispatch (1-3hrs Delivery)
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: 1.45, marginTop: '0.2rem' }}>
                        Or Express Delivery with partners such as StarTrack or AusPost.
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Express Notice Card */}
              <div style={{
                backgroundColor: '#faf6f5',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(46, 26, 16, 0.1)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <ShieldAlert size={24} style={{ color: '#c06517', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2f0d0e', marginBottom: '0.25rem' }}>
                    Delivery Options
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                    Immediate Dispatch (1-3hrs Delivery) is handled by our official Didi partners. Express Delivery is priority express with courier partners such as StarTrack or AusPost.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Accordion */}
      <section className="contact-faq-section" style={{ backgroundColor: '#faf6f5', padding: '5rem 1.5rem 6rem 1.5rem', borderTop: '1px solid rgba(46, 26, 16, 0.08)' }}>
        <div className="container" style={{ maxWidth: '840px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <HelpCircle size={32} style={{ color: '#c06517', marginBottom: '0.75rem' }} />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 800, color: '#2f0d0e' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1rem', marginTop: '0.4rem' }}>
              Quick answers regarding shipping, age compliance, and humidor freshness.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid rgba(46, 26, 16, 0.08)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: '#2f0d0e'
                    }}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        color: '#c06517',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 1.5rem 1.25rem 1.5rem',
                      fontSize: '0.95rem',
                      color: '#4b5563',
                      lineHeight: 1.6,
                      borderTop: '1px solid rgba(46, 26, 16, 0.05)'
                    }}>
                      <p style={{ margin: '0.75rem 0 0 0' }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
};
