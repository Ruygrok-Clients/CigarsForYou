import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StockNotificationModal } from '../components/StockNotificationModal';
import {
  Search,
  SlidersHorizontal,
  AlertCircle,
  Package,
  Flame,
  Award,
  Crown,
  Sparkles,
  Shield,
  Snowflake,
  Layers,
  Globe
} from 'lucide-react';

const FALLBACK_CIGARETTES: Product[] = [
  {
    id: 'marlboro-gold-25s',
    name: 'Marlboro Gold 25s',
    brand: 'Marlboro',
    slug: 'marlboro-gold-25s',
    price: 48.00,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'US / International',
    active: true,
    description: 'Classic smooth taste, premium Virginia blend in 25-pack format.'
  },
  {
    id: 'marlboro-red-25s',
    name: 'Marlboro Red 25s',
    brand: 'Marlboro',
    slug: 'marlboro-red-25s',
    price: 49.50,
    currency: 'AUD',
    stock: 85,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'US / International',
    active: true,
    description: 'Full-flavored rich American blend cigarette.'
  },
  {
    id: 'winfield-red-25s',
    name: 'Winfield Red 25s',
    brand: 'Winfield',
    slug: 'winfield-red-25s',
    price: 46.00,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'Australian Blend',
    active: true,
    description: "Australia's iconic bold tobacco blend."
  },
  {
    id: 'winfield-blue-25s',
    name: 'Winfield Blue 25s',
    brand: 'Winfield',
    slug: 'winfield-blue-25s',
    price: 46.00,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'Australian Blend',
    active: true,
    description: 'Smooth medium-flavor signature Australian tobacco.'
  },
  {
    id: 'benson-hedges-smooth-20s',
    name: 'Benson & Hedges Smooth 20s',
    brand: 'Benson & Hedges',
    slug: 'benson-hedges-smooth-20s',
    price: 44.50,
    currency: 'AUD',
    stock: 60,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'UK Blend',
    active: true,
    description: 'Gold-leaf refined Virginia tobacco for an ultra-smooth finish.'
  },
  {
    id: 'benson-hedges-special-filter-25s',
    name: 'Benson & Hedges Special Filter 25s',
    brand: 'Benson & Hedges',
    slug: 'benson-hedges-special-filter-25s',
    price: 48.00,
    currency: 'AUD',
    stock: 40,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'UK Blend',
    active: true,
    description: 'Premium king size filter with rich golden tobacco notes.'
  },
  {
    id: 'peter-stuyvesant-blue-25s',
    name: 'Peter Stuyvesant Blue 25s',
    brand: 'Peter Stuyvesant',
    slug: 'peter-stuyvesant-blue-25s',
    price: 45.00,
    currency: 'AUD',
    stock: 90,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'International',
    active: true,
    description: 'International full flavor blend with a crisp, satisfying draw.'
  },
  {
    id: 'dunhill-fine-cut-master-blend',
    name: 'Dunhill Fine Cut Master Blend',
    brand: 'Dunhill',
    slug: 'dunhill-fine-cut-master-blend',
    price: 52.00,
    currency: 'AUD',
    stock: 35,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'British Heritage',
    active: true,
    description: 'Finely cut oriental and Virginia leaves with Relocale lock foil.'
  },
  {
    id: 'rothmans-blue-25s',
    name: 'Rothmans Blue 25s',
    brand: 'Rothmans',
    slug: 'rothmans-blue-25s',
    price: 42.50,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'British Heritage',
    active: true,
    description: 'Classic British heritage blend offering balanced smoothness.'
  },
  {
    id: 'marlboro-ice-blast-menthol',
    name: 'Marlboro Ice Blast Menthol',
    brand: 'Menthol & Capsule',
    slug: 'marlboro-ice-blast-menthol',
    price: 50.00,
    currency: 'AUD',
    stock: 50,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'Menthol Blend',
    active: true,
    description: 'Crushable cooling menthol capsule technology for intense freshness.'
  },
  {
    id: 'champion-ruby-roll-your-own-50g',
    name: 'Champion Ruby Roll-Your-Own 50g',
    brand: 'Roll-Your-Own',
    slug: 'champion-ruby-roll-your-own-50g',
    price: 85.00,
    currency: 'AUD',
    stock: 25,
    imageUrl: '',
    category: 'cigarettes',
    origin: 'Tobacco Pouch',
    active: true,
    description: 'Premium fine-cut pouch tobacco with natural moisture retention.'
  }
];

export const CigarettesPage: React.FC = () => {
  const { brandSlug } = useParams<{ brandSlug?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandSlug || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

  // Sync selectedBrand with URL parameter
  useEffect(() => {
    if (brandSlug) {
      setSelectedBrand(brandSlug);
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
          if (d.category === 'cigarettes') {
            list.push({ id: doc.id, ...d });
          }
        });
        setProducts(list.length > 0 ? list : FALLBACK_CIGARETTES);
      } catch (err) {
        console.error('Error fetching cigarette products:', err);
        setProducts(FALLBACK_CIGARETTES);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const displayProducts = useMemo(() => {
    return products.length > 0 ? products : FALLBACK_CIGARETTES;
  }, [products]);

  // Sidebar Categories definition matching reference layout
  const categoriesList = useMemo(() => {
    const getCount = (bName: string) => {
      if (bName === 'all') return displayProducts.length;
      return displayProducts.filter(p =>
        p.brand.toLowerCase().includes(bName.toLowerCase()) ||
        p.name.toLowerCase().includes(bName.toLowerCase())
      ).length;
    };

    return [
      { name: 'All Cigarettes', slug: 'all', icon: Package, count: displayProducts.length },
      { name: 'Marlboro', slug: 'marlboro', icon: Flame, count: getCount('Marlboro') },
      { name: 'Winfield', slug: 'winfield', icon: Award, count: getCount('Winfield') },
      { name: 'Benson & Hedges', slug: 'benson-hedges', icon: Crown, count: getCount('Benson') },
      { name: 'Peter Stuyvesant', slug: 'peter-stuyvesant', icon: Globe, count: getCount('Stuyvesant') },
      { name: 'Dunhill', slug: 'dunhill', icon: Shield, count: getCount('Dunhill') },
      { name: 'Rothmans', slug: 'rothmans', icon: Sparkles, count: getCount('Rothmans') },
      { name: 'Menthol & Capsule', slug: 'menthol-capsule', icon: Snowflake, count: getCount('Menthol') },
      { name: 'Roll-Your-Own', slug: 'roll-your-own', icon: Layers, count: getCount('Roll') }
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

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        if (!matchName && !matchBrand) return false;
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
            Retail Tobacco Selection
          </span>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.6rem)',
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 0.6rem 0'
          }}>
            {selectedBrand === 'all' ? 'Retail Cigarettes' : `${selectedBrand} Cigarettes`}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ color: '#515154', fontSize: '1rem', margin: 0, lineHeight: 1.5 }}>
              Browse our full catalogue of {displayProducts.length} retail cigarette brands, delivered fresh Australia-wide.
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
                  placeholder="Search cigarettes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                Loading cigarettes catalog...
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
                <h3 style={{ fontSize: '1.4rem', color: '#1a1a1a', marginBottom: '0.5rem' }}>No cigarettes match your criteria</h3>
                <p style={{ color: '#515154', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  Try resetting your search query or selecting a different brand category.
                </p>
                <button
                  className="btn btn-outline"
                  onClick={() => { setSelectedBrand('all'); setSearchQuery(''); setInStockOnly(false); }}
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
      {selectedNotifyProduct && (
        <StockNotificationModal
          product={selectedNotifyProduct}
          onClose={() => setSelectedNotifyProduct(null)}
        />
      )}
    </div>
  );
};
