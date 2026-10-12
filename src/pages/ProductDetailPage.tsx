import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { BrandStory, Product, ProductRange } from '../types';
import { useCart } from '../context/CartContext';
import { useStockNotify } from '../context/StockNotifyContext';
import { useToast } from '../components/Toast';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { ClosingSoonCountdownBanner } from '../components/ClosingSoonCountdownBanner';
import { useProductViewers } from '../hooks/useProductViewers';
import {
  getBulkTiers,
  isTobaccoRange,
  resolveTier,
  savingsAmount,
  savingsPercent,
  unitPriceForTier
} from '../utils/bulkPricing';
import { rangeBasePath, rangeLabel, slugifyLabel } from '../constants/productRanges';
import { brandTitle } from '../lib/brand';
import { trackViewItem } from '../lib/analytics';
import { applyJsonLd, productNodes, siteGraph } from '../lib/jsonld';
import { absoluteCanonical, applySeo, productDescription, productTitle } from '../lib/seo';
import { responsiveImage } from '../lib/responsiveImage';
import { fetchBrandStory, fetchProducts } from '../services/catalog';
import { ProductCard } from '../components/ProductCard';
import { InlineMarkdown } from '../components/InlineMarkdown';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { 
  Bell, 
  Flame, 
  ChevronRight,
  ArrowRight,
  Calendar,
  MapPin,
  Building,
  Check
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isWatching } = useStockNotify();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [recommendedCigars, setRecommendedCigars] = useState<Product[]>([]);
  const [relatedNotifyProduct, setRelatedNotifyProduct] = useState<Product | null>(null);
  const [selectedBundleItems, setSelectedBundleItems] = useState<Record<string, boolean>>({});
  const [brandStory, setBrandStory] = useState<BrandStory | null>(null);
  const viewerCount = useProductViewers(product?.id);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      setCatalog([]);
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
          }
        }
        setProduct(foundProduct);
        setQuantity(1);

        try {
          const loadedCatalog = await fetchProducts();
          setCatalog(loadedCatalog);
          const companionIds = foundProduct?.fbtCompanionIds || [];
          const byId = new Map(loadedCatalog.filter((item) => item.active && item.id).map((item) => [item.id as string, item]));
          const shown = companionIds
            .map((id) => byId.get(id))
            .filter((item): item is Product => Boolean(item));
          setRecommendedCigars(shown);

          const initialChecked: Record<string, boolean> = {};
          shown.forEach(item => {
            const itemKey = item.id || item.slug;
            initialChecked[itemKey] = true;
          });
          setSelectedBundleItems(initialChecked);
        } catch (err) {
          console.error('Error fetching related products:', err);
          setRecommendedCigars([]);
          setCatalog([]);
        }

      } catch (err) {
        console.error('Error fetching product detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    if (!product?.brandStoryId) {
      setBrandStory(null);
      return;
    }
    fetchBrandStory(product.brandStoryId)
      .then((story) => {
        if (!cancelled) setBrandStory(story);
      })
      .catch((err) => {
        console.error('Error fetching brand story:', err);
        if (!cancelled) setBrandStory(null);
      });
    return () => {
      cancelled = true;
    };
  }, [product?.brandStoryId]);

  const maxAllowedQuantity = useMemo(() => {
    if (!product) return 1;
    return product.stock > 0 ? product.stock : 1;
  }, [product]);

  useEffect(() => {
    if (!product || product.stock <= 0) return;
    if (quantity > product.stock) setQuantity(product.stock);
  }, [product, quantity]);

  useEffect(() => {
    if (!product) return;
    trackViewItem(product);
  }, [product]);

  useLayoutEffect(() => {
    if (loading) {
      applySeo({ robots: 'noindex,follow', canonical: null, description: null });
      applyJsonLd(siteGraph());
    } else if (!product) {
      applySeo({
        title: brandTitle('Product Not Found'),
        description: null,
        robots: 'noindex,follow',
        canonical: null,
      });
      applyJsonLd(siteGraph());
    } else {
      const title = productTitle(product.brand, product.name);
      const description = productDescription(product);
      if (product.active !== true || !product.slug) {
        applySeo({ title, description, robots: 'noindex,follow', canonical: null });
        applyJsonLd(siteGraph());
      } else {
        applySeo({
          title,
          description,
          robots: 'index,follow',
          canonical: absoluteCanonical(`/product/${product.slug}`),
          image: product.imageUrl,
        });
        applyJsonLd(siteGraph(productNodes(product)));
      }
    }
    return () => {
      applyJsonLd(siteGraph());
    };
  }, [loading, product]);

  const sameBrandProducts = useMemo(() => {
    if (!product) return [];
    const brand = product.brand.trim().toLowerCase();
    const excluded = new Set(recommendedCigars.map((item) => item.id || item.slug));
    excluded.add(product.id || product.slug);
    const others = catalog.filter((item) => {
      if (!item.active || !item.slug) return false;
      if ((item.brand || '').trim().toLowerCase() !== brand) return false;
      const key = item.id || item.slug;
      return !excluded.has(key);
    });
    const inStock = others.filter((item) => item.stock > 0);
    const pool = inStock.length > 0 ? inStock : others;
    return pool.slice(0, 4);
  }, [catalog, product, recommendedCigars]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: '6rem 0', textAlign: 'center', color: '#86868b' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid #e5e5e7', borderTopColor: '#c06517', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '1rem', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: '6rem 0', textAlign: 'center' }}>
        <div className="container">
          <h1 style={{ color: '#2f0d0e', marginBottom: '1rem', fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Product Not Found</h1>
          <p style={{ color: '#5c3537', marginBottom: '2rem' }}>
            The requested product could not be located in our catalogue.
          </p>
          <Link to="/shop" className="btn btn-primary">
            Return to Shop Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isCigar = !product.category || product.category === 'cigars';
  const usesBulkPricing = isTobaccoRange(product.category);
  const productRange: ProductRange = product.category || 'cigars';
  const rangePath = rangeBasePath(productRange);
  const bulkTiers = getBulkTiers(product);
  const activeTier = usesBulkPricing ? resolveTier(bulkTiers, quantity) : null;
  const story = (product.extendedDescription || '').trim();
  const tastingNotes = (product.tastingNotes || []).map((note) => note.trim()).filter(Boolean);
  const detailTagline = (product.shortDescription || '').trim();
  const specs = product.specifications;
  const rangeEyebrow = isCigar ? 'CUBAN CIGARS' : rangeLabel(productRange).toUpperCase();

  const unitPrice = usesBulkPricing
    ? unitPriceForTier(product.price, activeTier)
    : Math.round(product.price * 100) / 100;
  const totalLinePrice = unitPrice * quantity;
  const lineSavings = usesBulkPricing ? savingsAmount(product.price, unitPrice, quantity) : 0;
  const activeSavingsPercent = activeTier ? savingsPercent(activeTier) : 0;

  const inStock = product.stock > 0;
  const watchingStock = isWatching(product);
  const selectedVariantRemaining = product.stock;
  const hasViewers = viewerCount != null && viewerCount > 0;
  const purchaseCountRaw = product.purchaseCount;
  const boughtCount = typeof purchaseCountRaw === 'number' && purchaseCountRaw > 0
    ? Math.floor(purchaseCountRaw)
    : null;

  const handleAddToCart = () => {
    if (!inStock) {
      if (!watchingStock) setNotifyModalOpen(true);
      return;
    }

    // Pass catalogue list price; CartContext resolves bulk tiers from quantity.
    addToCart(product, quantity);
    showToast(`Added ${quantity}x ${product.name} ($${totalLinePrice.toFixed(2)} AUD) to cart!`);
  };

  const handleBuyNow = () => {
    if (!inStock) {
      if (!watchingStock) setNotifyModalOpen(true);
      return;
    }

    addToCart(product, quantity);
    navigate('/cart');
  };

  const checkedRecommendedCigars = recommendedCigars.filter(c => {
    const key = c.id || c.slug;
    return selectedBundleItems[key];
  });

  const companionUnitPrice = (item: Product) => {
    if (!isTobaccoRange(item.category)) return Math.round(item.price * 100) / 100;
    return unitPriceForTier(item.price, resolveTier(getBulkTiers(item), 1));
  };

  const recommendedSubtotal = checkedRecommendedCigars.reduce((sum, c) => sum + companionUnitPrice(c), 0);

  const bundleTotalPrice = totalLinePrice + recommendedSubtotal;

  const handleAddBundleToCart = () => {
    addToCart(product, quantity);

    checkedRecommendedCigars.forEach((cigar) => {
      addToCart(cigar, 1);
    });

    showToast(`Added bundle (${1 + checkedRecommendedCigars.length} items) to your cart!`);
  };


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

        /* Frequently Bought Together: stack cards + pluses on mobile */
        .fbt-product-chain {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .fbt-product-card {
          width: 100% !important;
          max-width: 280px;
          box-sizing: border-box;
        }
        .fbt-plus {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          line-height: 1;
        }
        .fbt-bundle-box {
          padding: 1.25rem !important;
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
          .fbt-product-chain {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: stretch;
            justify-content: center;
            gap: 1.5rem;
          }
          .fbt-product-card {
            width: 230px !important;
            max-width: none;
          }
          .fbt-plus {
            width: auto;
          }
          .fbt-bundle-box {
            padding: 2rem !important;
          }
        }
      `}</style>

      {/* Top Breadcrumb Navigation */}
      <div style={{ borderBottom: '1px solid #f0f0f2', backgroundColor: '#ffffff', padding: '1rem 0' }}>
        <div className="container">
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#6e6e73' }}>
            <Link to={rangePath} style={{ color: '#6e6e73', textDecoration: 'none' }}>{rangeLabel(productRange)}</Link>
            <ChevronRight size={14} style={{ opacity: 0.6 }} />
            <Link to={`${rangePath}/${encodeURIComponent(slugifyLabel(product.brand))}`} style={{ color: '#6e6e73', textDecoration: 'none' }}>
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
                    {...responsiveImage(product.imageUrl, '(min-width: 900px) 50vw, 100vw')}
                    alt={product.name}
                    loading="eager"
                    fetchPriority="high"
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
                      {isCigar ? `Authentic ${product.origin || 'Cuban'} Tobacco Vitola` : rangeLabel(productRange)}
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
                {product.brand} • {rangeEyebrow}
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
                  AUD {quantity > 1 ? `(${quantity}x @ $${unitPrice.toFixed(2)} each)` : '(Inc. GST)'}
                </span>
              </div>

              {lineSavings > 0 && (
                <p style={{
                  color: '#c06517',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  margin: '0 0 0.35rem'
                }}>
                  You save ${lineSavings.toFixed(2)} ({activeSavingsPercent}%)
                </p>
              )}

              {selectedVariantRemaining > 0 && selectedVariantRemaining < 20 && (
                <p style={{
                  color: '#6e6e73',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  margin: '0 0 0.25rem'
                }}>
                  {selectedVariantRemaining} Remaining
                </p>
              )}

              {(hasViewers || boughtCount !== null) && (
                <p
                  className="social-proof-shimmer"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    margin: '0 0 0.75rem'
                  }}
                >
                  {hasViewers && (
                    <>
                      <AnimatedNumber value={viewerCount ?? 0} /> {(viewerCount ?? 0) === 1 ? 'person' : 'people'} viewing this right now
                    </>
                  )}
                  {hasViewers && boughtCount !== null && (
                    <>
                      {' '}
                      <span aria-hidden="true">·</span>
                      {' '}
                    </>
                  )}
                  {boughtCount !== null && (
                    <>{boughtCount.toLocaleString()} bought</>
                  )}
                </p>
              )}

              {detailTagline && (
                <p style={{ color: '#515154', fontSize: '0.98rem', lineHeight: 1.5, marginBottom: '2rem' }}>
                  {detailTagline}
                </p>
              )}

              {usesBulkPricing && bulkTiers.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#86868b',
                  marginBottom: '0.8rem'
                }}>
                  Buy more, save more
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  {bulkTiers.map((tier) => {
                    const isSelected = activeTier?.id === tier.id;
                    const tierUnit = unitPriceForTier(product.price, tier);
                    const tierSave = savingsPercent(tier);
                    const tierAvailable = product.stock >= tier.minQuantity;

                    return (
                      <button
                        key={tier.id}
                        type="button"
                        disabled={!tierAvailable}
                        onClick={() => {
                          if (!tierAvailable) return;
                          setQuantity(tier.minQuantity);
                        }}
                        style={{
                          minWidth: '150px',
                          padding: '0.85rem 1.1rem',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #c06517' : '1px solid #d2d2d7',
                          backgroundColor: isSelected ? '#fff9f5' : '#ffffff',
                          cursor: tierAvailable ? 'pointer' : 'not-allowed',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          opacity: tierAvailable ? 1 : 0.55
                        }}
                      >
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f' }}>
                          Buy {tier.minQuantity}+
                        </div>
                        <div style={{ fontSize: '0.85rem', color: isSelected ? '#c06517' : '#6e6e73', marginTop: '0.2rem', fontWeight: 600 }}>
                          ${tierUnit.toFixed(2)} each
                        </div>
                        {tierSave > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#c06517', marginTop: '0.25rem', fontWeight: 700 }}>
                            Save {tierSave}%
                          </div>
                        )}
                        {!tierAvailable && (
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Not enough stock
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Action Buttons: Conditional based on selected option stock */}
              <div style={{ marginBottom: '2.5rem' }}>
                {!inStock ? (
                  watchingStock ? (
                    <button
                      type="button"
                      disabled
                      aria-label="You'll be notified when this product is back in stock"
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '8px',
                        padding: '0 1.8rem',
                        height: '48px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        cursor: 'default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%'
                      }}
                    >
                      <Check size={18} /> You'll be notified when in stock
                    </button>
                  ) : (
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
                  )
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Quantity Counter bounded by unit stock */}
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
                        Maximum available stock reached ({maxAllowedQuantity})
                      </div>
                    )}
                  </div>
                )}
              </div>

              {story && (
              <div style={{
                color: '#333336',
                fontSize: '0.96rem',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #f0f0f2'
              }}>
                {story.split('\n\n').filter(Boolean).map((paragraph, idx) => (
                  <p key={idx} style={{ marginBottom: '1rem' }}>
                    <InlineMarkdown text={paragraph} />
                  </p>
                ))}
              </div>
              )}

              {tastingNotes.length > 0 && (
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
                  {tastingNotes.map((note, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                      <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {isCigar && specs && (specs.vitola || specs.ringGauge || specs.length || specs.strength || specs.wrapper || specs.smokingTime) && (
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
                  {specs.vitola && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Vitola Shape:</strong> {specs.vitola}{specs.factoryName ? ` (${specs.factoryName})` : ''}</span>
                  </div>
                  )}
                  {(specs.ringGauge || specs.length) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Ring Gauge & Length:</strong> {specs.ringGauge ? `${specs.ringGauge} RG` : ''}{specs.ringGauge && specs.length ? ' x ' : ''}{specs.length || ''}</span>
                  </div>
                  )}
                  {specs.strength && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Strength Profile:</strong> {specs.strength}</span>
                  </div>
                  )}
                  {specs.wrapper && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Wrapper Leaf:</strong> 100% {specs.wrapper}</span>
                  </div>
                  )}
                  {specs.smokingTime && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.94rem', color: '#1d1d1f' }}>
                    <span style={{ color: '#c06517', fontWeight: 700 }}>—</span>
                    <span><strong>Smoking Duration:</strong> Approx. {specs.smokingTime}</span>
                  </div>
                  )}
                </div>
              </div>
              )}

              {inStock && recommendedCigars.length > 0 && typeof product.fbtStat === 'number' && (
                <button
                  type="button"
                  onClick={() => document.getElementById('frequently-bought-together')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    width: '100%',
                    textAlign: 'left',
                    marginTop: '1.25rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(192, 101, 23, 0.35)',
                    background: 'rgba(192, 101, 23, 0.08)',
                    color: '#1d1d1f',
                    fontSize: '0.92rem',
                    lineHeight: 1.45,
                    cursor: 'pointer'
                  }}
                >
                  <span>
                    Based on our data, <strong>{product.fbtStat}%</strong> of customers also buy one or more of the items in Frequently Bought Together
                  </span>
                  <ArrowRight size={18} strokeWidth={2.25} style={{ flexShrink: 0, color: '#c06517' }} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {brandStory && (
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
              {brandStory.founded && (
                <span style={{ color: '#86868b', fontSize: '0.88rem' }}>Founded {brandStory.founded}</span>
              )}
            </div>

            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.4rem',
              color: '#2f0d0e',
              marginBottom: '1rem',
              lineHeight: 1.2
            }}>
              {brandStory.title || brandStory.name}
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
                <span><strong>Factory:</strong> {brandStory.factory}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5c3537', fontSize: '0.9rem' }}>
                <MapPin size={18} style={{ color: '#c06517' }} />
                <span><strong>Origin:</strong> {brandStory.origin}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5c3537', fontSize: '0.9rem' }}>
                <Calendar size={18} style={{ color: '#c06517' }} />
                <span><strong>Founded:</strong> {brandStory.founded}</span>
              </div>
            </div>

            {/* Brand History Story Text */}
            <div style={{ color: '#422829', fontSize: '1.02rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>
              {brandStory.description.split('\n\n').filter(Boolean).map((para, i) => (
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
              {brandStory.highlights.map((pt, idx) => (
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
      )}

      {recommendedCigars.length > 0 && (
      <div style={{ padding: '5rem 0 3rem 0', backgroundColor: '#ffffff' }}>
        <div className="container">
          {/* Main Product Out of Stock (stock <= 0): Display "Explore Other Products In Stock" */}
          {!inStock ? (
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
                  Other products currently in stock that pair with this item.
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
                          <img {...responsiveImage(cigar.imageUrl, '120px')} alt={cigar.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <div id="frequently-bought-together">
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
                  Often bought with this item.
                </p>
              </div>

              <div className="fbt-bundle-box" style={{
                border: '1px solid #e5e5e7',
                borderRadius: '12px',
                padding: '2rem',
                backgroundColor: '#fafafa',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                {/* Product Cards Chain (column on mobile, row on desktop) */}
                <div className="fbt-product-chain" style={{
                  marginBottom: '2.5rem'
                }}>
                  {/* Main Product Card */}
                  <div className="fbt-product-card" style={{
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
                          <img {...responsiveImage(product.imageUrl, '120px')} alt={product.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Flame size={36} style={{ color: '#c06517' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem' }}>
                        {product.brand} {product.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6e6e73', fontWeight: 600 }}>
                        {quantity} each
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
                    const companionPrice = companionUnitPrice(cigar);

                    return (
                      <React.Fragment key={cigarKey}>
                        <div className="fbt-plus" style={{
                          color: '#86868b',
                          fontWeight: 700,
                          fontSize: '1.4rem'
                        }}>
                          +
                        </div>

                        <div className="fbt-product-card" style={{
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
                                  <img {...responsiveImage(cigar.imageUrl, '120px')} alt={cigar.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <Flame size={36} style={{ color: '#c06517' }} />
                                )}
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.25rem' }}>
                                {cigar.brand} {cigar.name}
                              </div>
                            </Link>

                            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#6e6e73' }}>
                              Each (${companionPrice.toFixed(2)})
                            </div>
                          </div>

                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d1d1f', marginTop: '0.75rem' }}>
                            ${companionPrice.toFixed(2)} AUD
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
                      <strong>This item:</strong> {product.brand} {product.name} ({quantity} each) — <strong style={{ color: '#c06517' }}>${totalLinePrice.toFixed(2)} AUD</strong>
                    </span>
                  </label>

                  {/* Recommended Cigars Rows */}
                  {recommendedCigars.map((cigar) => {
                    const cigarKey = cigar.id || cigar.slug;
                    const companionPrice = companionUnitPrice(cigar);

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
                          <strong>Add:</strong> {cigar.brand} {cigar.name} (1 each) — <strong>${companionPrice.toFixed(2)} AUD</strong>
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
                        TOTAL PRICE FOR {1 + checkedRecommendedCigars.length} ITEMS
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
      )}

      {recommendedCigars.length < 2 && sameBrandProducts.length > 0 && (
        <div style={{ padding: '5rem 0 3rem 0', backgroundColor: '#ffffff' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.2rem',
                fontWeight: 700,
                color: '#1d1d1f'
              }}>
                More from {product.brand}
              </h2>
              <p style={{ color: '#6e6e73', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                Other {product.brand} cigars in the{' '}
                <Link to={`${rangePath}/${encodeURIComponent(slugifyLabel(product.brand))}`} style={{ color: '#c06517' }}>
                  {product.brand} catalogue
                </Link>
                .
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem'
            }}>
              {sameBrandProducts.map((item) => (
                <ProductCard
                  key={item.id || item.slug}
                  product={item}
                  listId={slugifyLabel(product.brand)}
                  listName={`More from ${product.brand}`}
                  imageLoading="lazy"
                  onOpenNotifyModal={setRelatedNotifyProduct}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock Notification Modal */}
      {notifyModalOpen && (
        <StockNotificationModal
          product={product}
          onClose={() => setNotifyModalOpen(false)}
        />
      )}
      {relatedNotifyProduct && (
        <StockNotificationModal
          product={relatedNotifyProduct}
          onClose={() => setRelatedNotifyProduct(null)}
        />
      )}
    </div>
  );
};
