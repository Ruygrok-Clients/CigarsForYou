import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, PackagingOption } from '../types';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { 
  FREQUENTLY_BOUGHT_ACCESSORIES, 
  getExtendedProductDetails 
} from '../data/productExtraData';
import { 
  ShoppingBag, 
  Bell, 
  Flame, 
  ChevronRight,
  Calendar,
  MapPin,
  Building
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingOption | null>(null);

  // Frequently Bought Together checked state
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, boolean>>({
    'cutter-guillotine': true,
    'lighter-triple-jet': true,
    'boveda-humidity-pack': true
  });

  // Function to check if a specific packaging option is in stock based on product stock
  const getRequiredStockForOption = (optionId: string) => {
    if (optionId === 'box25') return 25;
    if (optionId === 'box10') return 10;
    return 1; // 'single'
  };

  const isOptionAvailable = (optionId: string, stock: number) => {
    return stock >= getRequiredStockForOption(optionId);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0];
          const prodData = { id: docData.id, ...docData.data() } as Product;
          setProduct(prodData);
        } else {
          // If not found by slug, attempt fetch by ID
          const qId = query(collection(db, 'products'), where('__name__', '==', slug), limit(1));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            const docData = snapId.docs[0];
            const prodData = { id: docData.id, ...docData.data() } as Product;
            setProduct(prodData);
          } else {
            // Fallback product generator if DB is missing this slug
            const formattedName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            setProduct({
              id: slug,
              name: formattedName,
              brand: slug.toLowerCase().includes('cohiba') ? 'Cohiba' :
                     slug.toLowerCase().includes('montecristo') ? 'Montecristo' :
                     slug.toLowerCase().includes('partagas') ? 'Partagas' :
                     slug.toLowerCase().includes('romeo') ? 'Romeo y Julieta' :
                     slug.toLowerCase().includes('hoyo') ? 'Hoyo De Monterrey' :
                     slug.toLowerCase().includes('upmann') ? 'H. Upmann' : 'Habanos',
              slug: slug,
              price: 85,
              currency: 'AUD',
              stock: 50,
              imageUrl: '',
              category: 'cigars',
              origin: 'Cuban',
              active: true,
              description: `Authentic hand-rolled Cuban cigar featuring premium Vuelta Abajo aged tobacco leaves.`
            });
          }
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  // Derived extra details
  const extraDetails = useMemo(() => {
    if (!product) return null;
    return getExtendedProductDetails(product);
  }, [product]);

  // Auto-select initial packaging option (prefer largest in-stock size, or fallback to first option)
  useEffect(() => {
    if (extraDetails && extraDetails.packagingOptions.length > 0 && !selectedPackaging && product) {
      const bestAvailable = extraDetails.packagingOptions.find(opt => isOptionAvailable(opt.id, product.stock)) 
                         || extraDetails.packagingOptions[0];
      setSelectedPackaging(bestAvailable);
    }
  }, [extraDetails, selectedPackaging, product]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: '6rem 0', textAlign: 'center', color: '#86868b' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid #e5e5e7', borderTopColor: '#c06517', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '1rem', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}>Loading product details...</p>
      </div>
    );
  }

  if (!product || !extraDetails) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: '6rem 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: '#2f0d0e', marginBottom: '1rem', fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Cigar Not Found</h2>
          <p style={{ color: '#5c3537', marginBottom: '2rem' }}>
            The requested product could not be located in our humidor catalog.
          </p>
          <Link to="/shop" className="btn btn-primary">
            Return to Shop Catalog
          </Link>
        </div>
      </div>
    );
  }

  const currentMultiplier = selectedPackaging ? selectedPackaging.priceMultiplier : 1;
  const unitPrice = Math.round(product.price * currentMultiplier);

  // Stock check for currently selected packaging option
  const selectedOptionAvailable = selectedPackaging ? isOptionAvailable(selectedPackaging.id, product.stock) : false;

  const handleAddToCart = () => {
    if (!selectedOptionAvailable) {
      setNotifyModalOpen(true);
      return;
    }

    const itemToAdd: Product = {
      ...product,
      name: selectedPackaging && selectedPackaging.id !== 'single' 
        ? `${product.name} (${selectedPackaging.name})` 
        : product.name,
      price: unitPrice
    };

    addToCart(itemToAdd, quantity);
    showToast(`Added ${quantity}x ${itemToAdd.name} to cart!`);
  };

  const handleBuyNow = () => {
    if (!selectedOptionAvailable) {
      setNotifyModalOpen(true);
      return;
    }

    const itemToAdd: Product = {
      ...product,
      name: selectedPackaging && selectedPackaging.id !== 'single' 
        ? `${product.name} (${selectedPackaging.name})` 
        : product.name,
      price: unitPrice
    };

    addToCart(itemToAdd, quantity);
    navigate('/checkout');
  };

  // Frequently Bought Together calculation
  const selectedAccessoriesList = FREQUENTLY_BOUGHT_ACCESSORIES.filter(acc => selectedAccessories[acc.id]);
  const accessoriesSubtotal = selectedAccessoriesList.reduce((sum, acc) => sum + acc.price, 0);
  const bundleTotalPrice = unitPrice * quantity + accessoriesSubtotal;

  const handleAddBundleToCart = () => {
    // Add main product
    const itemToAdd: Product = {
      ...product,
      name: selectedPackaging && selectedPackaging.id !== 'single' 
        ? `${product.name} (${selectedPackaging.name})` 
        : product.name,
      price: unitPrice
    };
    addToCart(itemToAdd, quantity);

    // Add selected accessories
    selectedAccessoriesList.forEach(acc => {
      addToCart({
        id: acc.id,
        name: acc.name,
        brand: acc.brand,
        slug: acc.id,
        price: acc.price,
        currency: 'AUD',
        stock: 100,
        imageUrl: acc.imageUrl,
        category: 'cigars',
        origin: 'Accessory',
        active: true,
        description: acc.subtitle
      }, 1);
    });

    showToast(`Added bundle (${1 + selectedAccessoriesList.length} items) to your cart!`);
  };

  const brandHist = extraDetails.brandHist;

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Top Breadcrumb Navigation */}
      <div style={{ borderBottom: '1px solid #f0f0f2', backgroundColor: '#ffffff', padding: '1rem 0' }}>
        <div className="container">
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#6e6e73' }}>
            <Link to="/shop" style={{ color: '#6e6e73', textDecoration: 'none' }}>Peptides / Shop</Link>
            <ChevronRight size={14} style={{ opacity: 0.6 }} />
            <Link to={`/shop?brand=${encodeURIComponent(product.brand)}`} style={{ color: '#6e6e73', textDecoration: 'none' }}>
              {product.brand}
            </Link>
            <ChevronRight size={14} style={{ opacity: 0.6 }} />
            <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Product Details Section */}
      <div style={{ padding: '2.5rem 0 4rem 0' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3.5rem',
            alignItems: 'start'
          }}>
            {/* Left Column: Product Image Frame (Sticky to Product Text Height) */}
            <div style={{
              position: 'sticky',
              top: 'calc(var(--navbar-height, 120px) + 1.5rem)',
              alignSelf: 'start'
            }}>
              <div style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: '#f5f5f7',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
              }}>
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <Flame size={76} style={{ color: '#c06517', opacity: 0.85, marginBottom: '1rem' }} />
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#2f0d0e'
                    }}>
                      {product.brand}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#86868b', marginTop: '0.4rem' }}>
                      Authentic {product.origin || 'Cuban'} Tobacco Vitola
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Main Product Details */}
            <div>
              {/* Uppercase Category Tag */}
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#c06517',
                marginBottom: '0.6rem'
              }}>
                {product.brand} • CUBAN CIGARS
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: '2.6rem',
                fontWeight: 800,
                color: '#1d1d1f',
                letterSpacing: '-0.02em',
                marginBottom: '0.75rem',
                lineHeight: 1.15
              }}>
                {product.name}
              </h1>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '2.2rem',
                  fontWeight: 700,
                  color: '#1d1d1f',
                  letterSpacing: '-0.01em'
                }}>
                  ${unitPrice.toFixed(2)}
                </span>
                <span style={{ color: '#86868b', fontSize: '0.9rem', fontWeight: 500 }}>AUD (Inc. GST)</span>
              </div>

              {/* Subtitle summary */}
              <p style={{ color: '#515154', fontSize: '0.98rem', lineHeight: 1.5, marginBottom: '2rem' }}>
                {extraDetails.tagline}
              </p>

              {/* SELECT SIZE / PACKAGING */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#86868b',
                  marginBottom: '0.8rem'
                }}>
                  SELECT SIZE / PACKAGING
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  {extraDetails.packagingOptions.map((opt) => {
                    const isSelected = selectedPackaging?.id === opt.id;
                    const optPrice = Math.round(product.price * opt.priceMultiplier);
                    const optInStock = isOptionAvailable(opt.id, product.stock);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedPackaging(opt)}
                        style={{
                          minWidth: '130px',
                          padding: '0.85rem 1.1rem',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #c06517' : '1px solid #d2d2d7',
                          backgroundColor: isSelected ? '#fff9f5' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          opacity: optInStock ? 1 : 0.65
                        }}
                      >
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f' }}>
                          {opt.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: isSelected ? '#c06517' : '#6e6e73', marginTop: '0.2rem', fontWeight: 600 }}>
                          ${optPrice.toFixed(2)}
                        </div>
                        {!optInStock && (
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Out of Stock
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Conditional based on selected option stock */}
              <div style={{ marginBottom: '2.5rem' }}>
                {!selectedOptionAvailable ? (
                  <button
                    type="button"
                    onClick={() => setNotifyModalOpen(true)}
                    style={{
                      backgroundColor: '#c06517',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 1.8rem',
                      height: '48px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#a2520d')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#c06517')}
                  >
                    <Bell size={18} /> Notify me when in stock
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Quantity Counter */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #d2d2d7',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      height: '48px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        style={{ padding: '0 0.9rem', color: '#1d1d1f', fontSize: '1.2rem', height: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <span style={{ padding: '0 0.6rem', fontWeight: 700, color: '#1d1d1f', fontSize: '1rem' }}>
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                        style={{ padding: '0 0.9rem', color: '#1d1d1f', fontSize: '1.2rem', height: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>

                    {/* Primary Buy Now Filled Button */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      style={{
                        backgroundColor: '#c06517',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 1.8rem',
                        height: '48px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        flex: '1 1 160px'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#a2520d')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#c06517')}
                    >
                      Buy now
                    </button>

                    {/* Secondary Outlined Add to Cart Button */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#1d1d1f',
                        border: '1px solid #d2d2d7',
                        borderRadius: '8px',
                        padding: '0 1.8rem',
                        height: '48px',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        flex: '1 1 160px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f7';
                        e.currentTarget.style.borderColor = '#999999';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#d2d2d7';
                      }}
                    >
                      <ShoppingBag size={18} /> Add to cart
                    </button>
                  </div>
                )}
              </div>

              {/* Extended Product Description Paragraph */}
              <div style={{
                color: '#333336',
                fontSize: '0.96rem',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #f0f0f2'
              }}>
                {extraDetails.expandedDesc.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} style={{ marginBottom: '1rem' }}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* BENEFITS / TASTING NOTES (Matching Screenshot Style) */}
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#86868b',
                  marginBottom: '1rem'
                }}>
                  BENEFITS & TASTING PROFILE
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {extraDetails.tastingNotes.map((note, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                      <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SPECIFICATIONS (Matching Screenshot Style) */}
              <div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#86868b',
                  marginBottom: '1rem'
                }}>
                  SPECIFICATIONS & VITOLA
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Vitola Shape:</strong> {extraDetails.specifications.vitola} ({extraDetails.specifications.factoryName})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Ring Gauge & Length:</strong> {extraDetails.specifications.ringGauge} RG x {extraDetails.specifications.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Strength Profile:</strong> {extraDetails.specifications.strength}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Wrapper Leaf:</strong> 100% {extraDetails.specifications.wrapper}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Smoking Duration:</strong> Approx. {extraDetails.specifications.smokingTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BRAND & HISTORY SECTION */}
      <div style={{ backgroundColor: '#faf7f5', borderTop: '1px solid #eae2dc', borderBottom: '1px solid #eae2dc', padding: '4.5rem 0' }}>
        <div className="container">
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span style={{
                backgroundColor: '#c06517',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.3rem 0.8rem',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Brand Heritage
              </span>
              <span style={{ color: '#86868b', fontSize: '0.88rem' }}>Founded {brandHist.foundingYear}</span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.4rem',
              color: '#2f0d0e',
              marginBottom: '1rem',
              lineHeight: 1.2
            }}>
              {product.brand}: {brandHist.title}
            </h2>

            {/* Quick meta points */}
            <div style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              marginBottom: '2rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid rgba(47, 13, 14, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5c3537', fontSize: '0.9rem' }}>
                <Building size={18} style={{ color: '#c06517' }} />
                <span><strong>Factory:</strong> {brandHist.factory}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5c3537', fontSize: '0.9rem' }}>
                <MapPin size={18} style={{ color: '#c06517' }} />
                <span><strong>Origin:</strong> {brandHist.origin}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5c3537', fontSize: '0.9rem' }}>
                <Calendar size={18} style={{ color: '#c06517' }} />
                <span><strong>Founded:</strong> {brandHist.foundingYear}</span>
              </div>
            </div>

            {/* Brand History Story Text */}
            <div style={{ color: '#422829', fontSize: '1.02rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>
              {brandHist.history.split('\n\n').map((para, i) => (
                <p key={i} style={{ marginBottom: '1.25rem' }}>
                  {para}
                </p>
              ))}
            </div>

            {/* Key Heritage Points */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem'
            }}>
              {brandHist.heritagePoints.map((pt, idx) => (
                <div key={idx} style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(47, 13, 14, 0.1)',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                }}>
                  <div style={{
                    backgroundColor: 'rgba(192, 101, 23, 0.12)',
                    color: '#c06517',
                    borderRadius: '50%',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    ✓
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#2f0d0e', fontWeight: 600, lineHeight: 1.4 }}>
                    {pt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FREQUENTLY BOUGHT TOGETHER SECTION */}
      <div style={{ padding: '5rem 0 3rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#c06517'
            }}>
              HUMIDOR BUNDLE RECOMMENDATIONS
            </span>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.2rem',
              fontWeight: 700,
              color: '#1d1d1f',
              marginTop: '0.5rem'
            }}>
              Frequently Bought Together
            </h2>
            <p style={{ color: '#6e6e73', fontSize: '0.95rem', marginTop: '0.4rem' }}>
              Pair your {product.name} with essential, hand-picked cigar accessories for the ultimate smoking experience.
            </p>
          </div>

          <div style={{
            border: '1px solid #e5e5e7',
            borderRadius: '12px',
            padding: '2rem',
            backgroundColor: '#fafafa',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            {/* Horizontal Product Chain */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem'
            }}>
              {/* Main Product Card */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '2px solid #c06517',
                borderRadius: '10px',
                padding: '1.25rem',
                width: '180px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(192, 101, 23, 0.08)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#c06517',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}>
                  THIS ITEM
                </div>

                <div style={{
                  width: '100px',
                  height: '100px',
                  margin: '0.5rem auto 0.8rem auto',
                  borderRadius: '6px',
                  backgroundColor: '#f4f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Flame size={36} style={{ color: '#c06517' }} />
                  )}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1d1d1f', lineClamp: 2, height: '2.4em', overflow: 'hidden' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c06517', marginTop: '0.4rem' }}>
                  ${unitPrice.toFixed(2)} AUD
                </div>
              </div>

              {/* Plus Sign */}
              {FREQUENTLY_BOUGHT_ACCESSORIES.map((accessory) => {
                const isChecked = selectedAccessories[accessory.id];

                return (
                  <React.Fragment key={accessory.id}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#86868b',
                      fontWeight: 700,
                      fontSize: '1.4rem'
                    }}>
                      +
                    </div>

                    <div style={{
                      backgroundColor: '#ffffff',
                      border: isChecked ? '1px solid #1d1d1f' : '1px solid #e5e5e7',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      width: '180px',
                      textAlign: 'center',
                      opacity: isChecked ? 1 : 0.5,
                      transition: 'all 0.15s ease'
                    }}>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        margin: '0.5rem auto 0.8rem auto',
                        borderRadius: '6px',
                        backgroundColor: '#f4f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img src={accessory.imageUrl} alt={accessory.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1d1d1f', lineClamp: 2, height: '2.4em', overflow: 'hidden' }}>
                        {accessory.name}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f', marginTop: '0.4rem' }}>
                        ${accessory.price.toFixed(2)} AUD
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Checkbox Controls List & Add Bundle CTA */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              maxWidth: '680px',
              margin: '0 auto',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e5e5e7'
            }}>
              {/* Main Product Row */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'default', fontSize: '0.92rem', color: '#1d1d1f' }}>
                <input type="checkbox" checked disabled style={{ accentColor: '#c06517', width: '18px', height: '18px' }} />
                <span>
                  <strong>This item:</strong> {product.name} ({selectedPackaging?.name || 'Single Stick'}) — <strong style={{ color: '#c06517' }}>${unitPrice.toFixed(2)} AUD</strong>
                </span>
              </label>

              {/* Accessories Rows */}
              {FREQUENTLY_BOUGHT_ACCESSORIES.map((acc) => (
                <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.92rem', color: '#1d1d1f' }}>
                  <input
                    type="checkbox"
                    checked={selectedAccessories[acc.id] || false}
                    onChange={(e) => setSelectedAccessories({
                      ...selectedAccessories,
                      [acc.id]: e.target.checked
                    })}
                    style={{ accentColor: '#c06517', width: '18px', height: '18px' }}
                  />
                  <span>
                    <strong>Add:</strong> {acc.name} — <strong>${acc.price.toFixed(2)} AUD</strong>
                  </span>
                </label>
              ))}

              {/* Total & Action Button */}
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e5e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TOTAL PRICE FOR {1 + selectedAccessoriesList.length} ITEMS
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1d1d1f' }}>
                    ${bundleTotalPrice.toFixed(2)} <span style={{ fontSize: '0.9rem', color: '#6e6e73', fontWeight: 500 }}>AUD</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddBundleToCart}
                  style={{
                    backgroundColor: '#c06517',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.9rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(192, 101, 23, 0.25)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#a2520d')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#c06517')}
                >
                  <ShoppingBag size={20} /> Add Selected ({1 + selectedAccessoriesList.length}) to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Notification Modal */}
      {notifyModalOpen && (
        <StockNotificationModal
          product={product}
          onClose={() => setNotifyModalOpen(false)}
        />
      )}
    </div>
  );
};
