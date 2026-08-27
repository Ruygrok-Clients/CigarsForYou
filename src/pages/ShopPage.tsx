import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { CIGAR_BRANDS } from '../components/Navbar';
import { CIGAR_CATALOG } from '../data/cigarCatalog';
import {
  Search,
  SlidersHorizontal,
  AlertCircle,
  Flame,
  Crown,
  Award,
  Sparkles,
  ShieldCheck,
  Sun,
  Zap,
  Shield,
  Star
} from 'lucide-react';

const FALLBACK_CIGARS: Product[] = CIGAR_CATALOG;

export const ShopPage: React.FC = () => {
  const { brandSlug } = useParams<{ brandSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandSlug || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

  // Sync searchQuery when URL search parameter changes
  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    setSearchQuery(urlQuery);
  }, [searchParams]);

  // Sync selectedBrand with URL parameter
  useEffect(() => {
    if (brandSlug) {
      const found = CIGAR_BRANDS.find(b => b.slug.toLowerCase() === brandSlug.toLowerCase());
      setSelectedBrand(found ? found.name : brandSlug);
    } else {
      setSelectedBrand('all');
    }
  }, [brandSlug]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'products'));
        const snap = await getDocs(q);
        const list: Product[] = [];
        snap.forEach(doc => {
          const d = doc.data() as Product;
          if (!d.category || d.category === 'cigars') {
            list.push({ id: doc.id, ...d });
          }
        });
        setProducts(list.length > 0 ? list : FALLBACK_CIGARS);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts(FALLBACK_CIGARS);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const displayProducts = useMemo(() => {
    return products.length > 0 ? products : FALLBACK_CIGARS;
  }, [products]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('search', val.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSelectedBrand('all');
    setSearchQuery('');
    setInStockOnly(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
  };

  // Sidebar Category Definition with Dynamic Counts
  const categoriesList = useMemo(() => {
    const getCountForBrand = (bName: string) => {
      if (bName === 'all') return displayProducts.length;
      return displayProducts.filter(p => p.brand.toLowerCase().includes(bName.toLowerCase())).length;
    };

    return [
      { name: 'All Cigars', slug: 'all', icon: Flame, count: displayProducts.length },
      { name: 'Cohiba', slug: 'cohiba', icon: Crown, count: getCountForBrand('Cohiba') },
      { name: 'Montecristo', slug: 'montecristo', icon: Award, count: getCountForBrand('Montecristo') },
      { name: 'Partagas', slug: 'partagas', icon: Sparkles, count: getCountForBrand('Partagas') },
      { name: 'Romeo y Julieta', slug: 'romeo-y-julieta', icon: ShieldCheck, count: getCountForBrand('Romeo') },
      { name: 'Hoyo De Monterrey', slug: 'hoyo-de-monterrey', icon: Sun, count: getCountForBrand('Hoyo') },
      { name: 'Trinidad', slug: 'trinidad', icon: Zap, count: getCountForBrand('Trinidad') },
      { name: 'Bolivar', slug: 'bolivar', icon: Shield, count: getCountForBrand('Bolivar') },
      { name: 'H. Upmann', slug: 'h-upmann', icon: Star, count: getCountForBrand('Upmann') }
    ];
  }, [displayProducts]);

  const filteredProducts = useMemo(() => {
    return displayProducts.filter(p => {
      // Brand filter
      if (selectedBrand !== 'all') {
        const pBrandClean = p.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
        const selBrandClean = selectedBrand.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!pBrandClean.includes(selBrandClean) && !selBrandClean.includes(pBrandClean)) {
          return false;
        }
      }

      // Stock filter
      if (inStockOnly && p.stock <= 0) return false;

      // Search query filter (multi-word match across brand, name, description, origin)
      if (searchQuery.trim()) {
        const qWords = searchQuery.toLowerCase().trim().split(/\s+/);
        const searchableText = `${p.brand} ${p.name} ${p.description || ''} ${p.origin || ''} ${p.category || ''}`.toLowerCase();
        const matchesAll = qWords.every(word => searchableText.includes(word));
        if (!matchesAll) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [displayProducts, selectedBrand, inStockOnly, searchQuery, sortBy]);

  return (
    <div style={{ backgroundColor: '#f9f8f6', minHeight: '100vh', padding: '2.5rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '1280px' }}>

        {/* Page Top Header matching Reference Screenshot */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#c06517',
            display: 'block',
            marginBottom: '0.4rem'
          }}>
            Genuine Habanos Selection
          </span>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.6rem)',
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 0.6rem 0'
          }}>
            {selectedBrand === 'all' ? 'Cuban Cigars' : `${selectedBrand} Cigars`}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ color: '#515154', fontSize: '1rem', margin: 0, lineHeight: 1.5 }}>
              Browse our full catalogue of {displayProducts.length} fine hand-rolled cigars, stored at optimal humidor conditions.
            </p>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              display: 'inline-block'
            }} />
          </div>
        </div>

        {/* Divider Line */}
        <div style={{ height: '1px', backgroundColor: '#e5e2da', width: '100%', marginBottom: '2.5rem' }} />

        {/* Main 2-Column Catalogue Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 270px) 1fr', gap: '2.5rem', alignItems: 'start' }} className="catalog-grid-layout">

          {/* Left Column: Categories Sidebar */}
          <aside className="catalog-sidebar-sticky" style={{ position: 'sticky', top: '145px', alignSelf: 'flex-start' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#71717a',
              marginBottom: '1.25rem'
            }}>
              CATEGORIES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {categoriesList.map(cat => {
                const isSelected = selectedBrand.toLowerCase().includes(cat.slug.toLowerCase()) ||
                  (cat.slug === 'all' && selectedBrand === 'all');

                if (isSelected) {
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => setSelectedBrand(cat.slug === 'all' ? 'all' : cat.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #e2ded5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        color: '#1a1a1a',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <cat.icon size={18} style={{ color: '#c06517' }} />
                        <span>{cat.name}</span>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1a1a' }}>
                        {cat.count}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedBrand(cat.slug === 'all' ? 'all' : cat.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#515154',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#efece6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <cat.icon size={18} style={{ color: '#71717a' }} />
                      <span>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#8c8c8e' }}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Search Bar & Product Grid */}
          <main>
            {/* Top Search & Filter Bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '440px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{
                    paddingLeft: '2.75rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2ded5',
                    fontSize: '0.95rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  placeholder="Search cigars..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                />
              </div>

              {/* Controls: Stock Toggle & Sort */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#515154', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    style={{ accentColor: '#c06517', width: '16px', height: '16px' }}
                  />
                  In Stock Only
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <SlidersHorizontal size={16} style={{ color: '#c06517' }} />
                  <select
                    className="form-control"
                    style={{
                      width: 'auto',
                      padding: '0.5rem 0.85rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2ded5',
                      fontSize: '0.875rem',
                      color: '#1a1a1a'
                    }}
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Item Count Display matching reference */}
            <div style={{ fontSize: '0.85rem', color: '#71717a', marginBottom: '1.5rem' }}>
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
            </div>

            {/* Product Cards Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem 0', color: '#8c8c8e' }}>
                Loading Cuban cigar catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2ded5',
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <AlertCircle size={44} style={{ color: '#c06517', margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.4rem', color: '#1a1a1a', marginBottom: '0.5rem' }}>No cigars match your criteria</h3>
                <p style={{ color: '#515154', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  Try resetting your search query or selecting a different brand category.
                </p>
                <button
                  className="btn btn-outline"
                  onClick={handleResetFilters}
                  style={{ borderRadius: '8px', borderColor: '#c06517', color: '#c06517' }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.5rem'
              }}>
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id || product.slug}
                    product={product}
                    onOpenNotifyModal={(p) => setSelectedNotifyProduct(p)}
                  />
                ))}
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Stock Notification Modal */}
      {
        selectedNotifyProduct && (
          <StockNotificationModal
            product={selectedNotifyProduct}
            onClose={() => setSelectedNotifyProduct(null)}
          />
        )
      }
    </div >
  );
};
