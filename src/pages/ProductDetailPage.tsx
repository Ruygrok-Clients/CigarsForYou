import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, PackagingOption } from '../types';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { ClosingSoonCountdownBanner } from '../components/ClosingSoonCountdownBanner';
import { useProductViewers } from '../hooks/useProductViewers';
import { 
  getExtendedProductDetails,
  getRecommendedCigarsForProduct,
  getRecCigarUnitPrice,
  getRecCigarPackName
} from '../data/productExtraData';
import { 
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
  
  // Real complementary cigars state & volume selections
  const [recommendedCigars, setRecommendedCigars] = useState<Product[]>([]);
  const [selectedBundleItems, setSelectedBundleItems] = useState<Record<string, boolean>>({});
  const [selectedRecPackagings, setSelectedRecPackagings] = useState<Record<string, string>>({});
  const viewerCount = useProductViewers(product?.id);

  // Function to check if a specific packaging option is in stock based on product stock
  const getRequiredStockForOption = (optionId: string) => {
    if (optionId === 'box25') return 25;
    if (optionId === 'box10') return 10;
    return 1; // 'single'
  };

  const isOptionAvailable = (optionId: string, stock: number) => {
    return stock >= getRequiredStockForOption(optionId);
  };

  const getMaxQuantityForOption = (optionId: string, stock: number) => {
    const req = getRequiredStockForOption(optionId);
    if (stock < req) return 0;
    return Math.floor(stock / req);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        let foundProduct: Product | null = null;
        if (!snap.empty) {
          const docData = snap.docs[0];
          foundProduct = { id: docData.id, ...docData.data() } as Product;
        } else {
          // If not found by slug, attempt fetch by ID
          const qId = query(collection(db, 'products'), where('__name__', '==', slug), limit(1));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            const docData = snapId.docs[0];
            foundProduct = { id: docData.id, ...docData.data() } as Product;
          } else {
            // Fallback product generator if DB is missing this slug
            const formattedName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            foundProduct = {
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
            };
          }
        }
        setProduct(foundProduct);

        // Fetch real IN-STOCK recommended cigars from DB or fallback catalog
        try {
          const recQuery = query(collection(db, 'products'), where('active', '==', true), limit(8));
          const recSnap = await getDocs(recQuery);
          let recList: Product[] = [];
          recSnap.forEach(doc => {
            const data = { id: doc.id, ...doc.data() } as Product;
            if (data.slug !== slug && data.stock > 0) {
              recList.push(data);
            }
          });

          if (recList.length < 2) {
            recList = getRecommendedCigarsForProduct(slug);
          } else {
            recList = recList.slice(0, 2);
          }
          setRecommendedCigars(recList);

          const initialChecked: Record<string, boolean> = {};
          const initialPacks: Record<string, string> = {};
          recList.forEach(item => {
            const itemKey = item.id || item.slug;
            initialChecked[itemKey] = true;
            initialPacks[itemKey] = 'single';
          });
          setSelectedBundleItems(initialChecked);
          setSelectedRecPackagings(initialPacks);
        } catch (err) {
          const fallbackRecs = getRecommendedCigarsForProduct(slug);
          setRecommendedCigars(fallbackRecs);
          const initialChecked: Record<string, boolean> = {};
          const initialPacks: Record<string, string> = {};
          fallbackRecs.forEach(item => {
            const itemKey = item.id || item.slug;
            initialChecked[itemKey] = true;
            initialPacks[itemKey] = 'single';
          });
          setSelectedBundleItems(initialChecked);
          setSelectedRecPackagings(initialPacks);
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

  // Max quantity calculation based on product stock and selected packaging option size
  const maxAllowedQuantity = useMemo(() => {
    if (!product || !selectedPackaging) return 1;
    const maxQty = getMaxQuantityForOption(selectedPackaging.id, product.stock);
    return maxQty > 0 ? maxQty : 1;
  }, [product, selectedPackaging]);

  // Clamp current quantity if packaging selection changes or stock limits change
  useEffect(() => {
    if (selectedPackaging && product) {
      const maxQty = getMaxQuantityForOption(selectedPackaging.id, product.stock);
      if (maxQty > 0 && quantity > maxQty) {
        setQuantity(maxQty);
      }
    }
  }, [selectedPackaging, product, quantity]);

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
  const totalLinePrice = unitPrice * quantity;

  // Stock check for currently selected packaging option
  const selectedOptionAvailable = selectedPackaging ? isOptionAvailable(selectedPackaging.id, product.stock) : false;
  const isMainProductOutOfStock = product.stock <= 0;

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
    showToast(`Added ${quantity}x ${itemToAdd.name} ($${totalLinePrice.toFixed(2)} AUD) to cart!`);
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
    navigate('/cart');
  };

  // Frequently Bought Together calculation for recommended cigars
  const checkedRecommendedCigars = recommendedCigars.filter(c => {
    const key = c.id || c.slug;
    return selectedBundleItems[key];
  });

  const recommendedSubtotal = checkedRecommendedCigars.reduce((sum, c) => {
    const key = c.id || c.slug;
    const packId = selectedRecPackagings[key] || 'single';
    return sum + getRecCigarUnitPrice(c, packId);
  }, 0);

  const bundleTotalPrice = totalLinePrice + recommendedSubtotal;

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

    // Add selected recommended cigars with volume selection
    checkedRecommendedCigars.forEach(cigar => {
      const key = cigar.id || cigar.slug;
      const packId = selectedRecPackagings[key] || 'single';
      const packPrice = getRecCigarUnitPrice(cigar, packId);
      const packName = getRecCigarPackName(packId);

      const cigarToAdd: Product = {
        ...cigar,
        name: packId !== 'single' ? `${cigar.name} (${packName})` : cigar.name,
        price: packPrice
      };
      addToCart(cigarToAdd, 1);
    });

    showToast(`Added bundle (${1 + checkedRecommendedCigars.length} cigars) to your cart!`);
  };

  const brandHist = extraDetails.brandHist;

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', minHeight: '100vh', paddingBottom: '5rem' }}>
      <style>{`
        .product-detail-grid {
          grid-template-columns: 1fr !important;
          gap: 2rem !important;
        }
        .product-detail-image-col {
          position: relative !important;
          top: auto !important;
          align-self: stretch !important;
          width: 100% !important;
        }

        @media (min-width: 769px) {
          .product-detail-grid {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)) !important;
            gap: 3.5rem !important;
          }
          .product-detail-image-col {
            position: sticky !important;
            top: calc(var(--navbar-height, 120px) + 1.5rem) !important;
            align-self: start !important;
            width: auto !important;
          }
        }
      `}</style>

      {/* Top Breadcrumb Navigation */}
      <div style={{ borderBottom: '1px solid #f0f0f2', backgroundColor: '#ffffff', padding: '1rem 0' }}>
        <div className="container">
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#6e6e73' }}>
            <Link to="/shop" style={{ color: '#6e6e73', textDecoration: 'none' }}>Cigars / Shop</Link>
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
          <div className="product-detail-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3.5rem',
            alignItems: 'start'
          }}>
            {/* Left Column: Product Image Frame (Sticky to Product Text Height on desktop) */}
            <div className="product-detail-image-col" style={{
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
              <ClosingSoonCountdownBanner />
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

              {/* Price (Dynamically increases with quantity selection) */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '2.2rem',
                  fontWeight: 700,
                  color: '#1d1d1f',
                  letterSpacing: '-0.01em'
                }}>
                  ${totalLinePrice.toFixed(2)}
                </span>
                <span style={{ color: '#86868b', fontSize: '0.9rem', fontWeight: 500 }}>
                  AUD {quantity > 1 ? `(${quantity}x @ $${unitPrice.toFixed(2)} / pack)` : '(Inc. GST)'}
                </span>
              </div>

              {product.stock > 0 && product.stock <= 20 && (
                <p style={{
                  color: '#c06517',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  margin: '0 0 0.35rem',
                  letterSpacing: '0.01em'
                }}>
                  {product.stock} Remaining Stock Left
                </p>
              )}

              {viewerCount != null && viewerCount > 0 && (
                <p style={{
                  color: '#6e6e73',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  margin: '0 0 0.75rem'
                }}>
                  {viewerCount} {viewerCount === 1 ? 'person' : 'people'} viewing this right now
                </p>
              )}

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
                    const maxQtyForOpt = getMaxQuantityForOption(opt.id, product.stock);

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
                        {!optInStock ? (
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Out of Stock
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#6e6e73', marginTop: '0.2rem' }}>
                            {maxQtyForOpt} pack{maxQtyForOpt > 1 ? 's' : ''} available
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
                  <div>
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Quantity Counter bounded strictly by available stock for selected packaging size */}
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
                          disabled={quantity <= 1}
                          style={{
                            padding: '0 0.9rem',
                            color: quantity <= 1 ? '#a1a1a6' : '#1d1d1f',
                            fontSize: '1.2rem',
                            height: '100%',
                            background: 'none',
                            border: 'none',
                            cursor: quantity <= 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          -
                        </button>
                        <span style={{ padding: '0 0.6rem', fontWeight: 700, color: '#1d1d1f', fontSize: '1rem' }}>
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.min(maxAllowedQuantity, quantity + 1))}
                          disabled={quantity >= maxAllowedQuantity}
                          style={{
                            padding: '0 0.9rem',
                            color: quantity >= maxAllowedQuantity ? '#a1a1a6' : '#1d1d1f',
                            fontSize: '1.2rem',
                            height: '100%',
                            background: 'none',
                            border: 'none',
                            cursor: quantity >= maxAllowedQuantity ? 'not-allowed' : 'pointer'
                          }}
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
                        Buy now (${totalLinePrice.toFixed(2)})
                      </button>

                      {/* Secondary Outlined Add to Cart Button (Icon Removed as requested) */}
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
                        Add to cart (${totalLinePrice.toFixed(2)})
                      </button>
                    </div>

                    {/* Stock limit notice */}
                    {quantity >= maxAllowedQuantity && (
                      <div style={{ fontSize: '0.78rem', color: '#c06517', marginTop: '0.5rem', fontWeight: 600 }}>
                        Maximum available stock reached ({maxAllowedQuantity} pack{maxAllowedQuantity > 1 ? 's' : ''})
                      </div>
                    )}
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

      {/* RECOMMENDATIONS / FREQUENTLY BOUGHT TOGETHER SECTION */}
      <div style={{ padding: '5rem 0 3rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          {/* Main Product Out of Stock (stock <= 0): Display "Explore Other Products In Stock" */}
          {isMainProductOutOfStock ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '2.2rem',
                  fontWeight: 700,
                  color: '#1d1d1f'
                }}>
                  Explore Other Products In Stock
                </h2>
                <p style={{ color: '#6e6e73', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                  Hand-selected premium Cuban cigars currently in stock in our humidor.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '2rem',
                maxWidth: '900px',
                margin: '0 auto'
              }}>
                {recommendedCigars.map((cigar) => {
                  const cigarKey = cigar.id || cigar.slug;
                  return (
                    <div key={cigarKey} style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e5e7',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '8px',
                        backgroundColor: '#f5f5f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        overflow: 'hidden'
                      }}>
                        {cigar.imageUrl ? (
                          <img src={cigar.imageUrl} alt={cigar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Flame size={44} style={{ color: '#c06517' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#c06517', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                        {cigar.brand}
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.4rem' }}>
                        {cigar.name}
                      </h3>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '1.25rem' }}>
                        ${cigar.price.toFixed(2)} AUD
                      </div>
                      <Link
                        to={`/product/${cigar.slug}`}
                        style={{
                          marginTop: 'auto',
                          backgroundColor: '#1d1d1f',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '0.65rem 1.4rem',
                          borderRadius: '6px',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        View Cigar
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Main Product In Stock: Display Frequently Bought Together with volume selection per cigar */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '2.2rem',
                  fontWeight: 700,
                  color: '#1d1d1f'
                }}>
                  Frequently Bought Together
                </h2>
                <p style={{ color: '#6e6e73', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                  Pair your {product.name} with these highly rated complementary Cuban cigars.
                </p>
              </div>

              <div style={{
                border: '1px solid #e5e5e7',
                borderRadius: '12px',
                padding: '2rem',
                backgroundColor: '#fafafa',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                {/* Horizontal Product Cards Chain (Spacious cards with volume selection) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'stretch',
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
                    width: '230px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(192, 101, 23, 0.08)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
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

                    <div>
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
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem' }}>
                        {product.brand} {product.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6e6e73', fontWeight: 600 }}>
                        {selectedPackaging?.name || 'Single Stick'} ({quantity}x)
                      </div>
                    </div>

                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#c06517', marginTop: '0.75rem' }}>
                      ${totalLinePrice.toFixed(2)} AUD
                    </div>
                  </div>

                  {/* Recommended Real Cigar Cards with Pack/Volume Selector */}
                  {recommendedCigars.map((cigar) => {
                    const cigarKey = cigar.id || cigar.slug;
                    const isChecked = selectedBundleItems[cigarKey];
                    const selectedPackId = selectedRecPackagings[cigarKey] || 'single';
                    const packPrice = getRecCigarUnitPrice(cigar, selectedPackId);

                    return (
                      <React.Fragment key={cigarKey}>
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
                          width: '230px',
                          textAlign: 'center',
                          opacity: isChecked ? 1 : 0.5,
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <Link to={`/product/${cigar.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                                {cigar.imageUrl ? (
                                  <img src={cigar.imageUrl} alt={cigar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <Flame size={36} style={{ color: '#c06517' }} />
                                )}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem' }}>
                                {cigar.brand} {cigar.name}
                              </div>
                            </Link>

                            {/* Packaging / Volume Selection for Recommended Cigar */}
                            <div style={{ marginTop: '0.5rem' }}>
                              <select
                                value={selectedPackId}
                                onChange={(e) => setSelectedRecPackagings({
                                  ...selectedRecPackagings,
                                  [cigarKey]: e.target.value
                                })}
                                style={{
                                  width: '100%',
                                  padding: '0.45rem 0.6rem',
                                  borderRadius: '6px',
                                  border: '1px solid #d2d2d7',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  backgroundColor: '#ffffff',
                                  color: '#1d1d1f',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="single">Single Stick (${cigar.price.toFixed(2)})</option>
                                {cigar.stock >= 10 && (
                                  <option value="box10">Box of 10 (${Math.round(cigar.price * 9.5).toFixed(2)})</option>
                                )}
                                {cigar.stock >= 25 && (
                                  <option value="box25">Cabinet of 25 (${Math.round(cigar.price * 23.5).toFixed(2)})</option>
                                )}
                              </select>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d1d1f', marginTop: '0.75rem' }}>
                            ${packPrice.toFixed(2)} AUD
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
                  maxWidth: '720px',
                  margin: '0 auto',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e5e7'
                }}>
                  {/* Main Product Row */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'default', fontSize: '0.92rem', color: '#1d1d1f' }}>
                    <input type="checkbox" checked disabled style={{ accentColor: '#c06517', width: '18px', height: '18px' }} />
                    <span>
                      <strong>This item:</strong> {product.brand} {product.name} ({selectedPackaging?.name || 'Single Stick'}) — <strong style={{ color: '#c06517' }}>${totalLinePrice.toFixed(2)} AUD</strong>
                    </span>
                  </label>

                  {/* Recommended Cigars Rows */}
                  {recommendedCigars.map((cigar) => {
                    const cigarKey = cigar.id || cigar.slug;
                    const selectedPackId = selectedRecPackagings[cigarKey] || 'single';
                    const packPrice = getRecCigarUnitPrice(cigar, selectedPackId);
                    const packName = getRecCigarPackName(selectedPackId);

                    return (
                      <label key={cigarKey} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.92rem', color: '#1d1d1f' }}>
                        <input
                          type="checkbox"
                          checked={selectedBundleItems[cigarKey] || false}
                          onChange={(e) => setSelectedBundleItems({
                            ...selectedBundleItems,
                            [cigarKey]: e.target.checked
                          })}
                          style={{ accentColor: '#c06517', width: '18px', height: '18px' }}
                        />
                        <span>
                          <strong>Add:</strong> {cigar.brand} {cigar.name} ({packName}) — <strong>${packPrice.toFixed(2)} AUD</strong>
                        </span>
                      </label>
                    );
                  })}

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
                        TOTAL PRICE FOR {1 + checkedRecommendedCigars.length} CIGARS
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
                      Add Selected ({1 + checkedRecommendedCigars.length}) to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
