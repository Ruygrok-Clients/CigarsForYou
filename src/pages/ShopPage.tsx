import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { CIGAR_BRANDS } from '../components/Navbar';
import { Search, SlidersHorizontal, AlertCircle } from 'lucide-react';

export const ShopPage: React.FC = () => {
  const { brandSlug } = useParams<{ brandSlug?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandSlug || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

  // Sync selectedBrand with URL route if parameter changes
  useEffect(() => {
    if (brandSlug) {
      // Find matching brand name or set slug
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
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(list);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter (only show cigars on shop page)
      if (p.category && p.category !== 'cigars') return false;

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
  }, [products, selectedBrand, inStockOnly, searchQuery, sortBy]);

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container">
        {/* Header Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
            Genuine Habanos Catalog
          </span>
          <h1 style={{ fontSize: '2.6rem', color: '#ffffff' }}>
            {selectedBrand === 'all' ? 'Cuban Cigar Catalog' : `${selectedBrand} Cigars`}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.4rem' }}>
            Hand-rolled in Havana. Available for immediate one-off purchase or automated subscription delivery.
          </p>
        </div>

        {/* Filters & Controls Header */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Search Cohiba, Montecristo, Siglo VI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* In Stock Toggle & Sort */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  style={{ accentColor: 'var(--accent-gold)' }}
                />
                In Stock Only
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SlidersHorizontal size={16} style={{ color: 'var(--accent-gold)' }} />
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
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

          {/* Brand Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingTop: '1rem',
            marginTop: '1rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setSelectedBrand('all')}
              className={`btn btn-sm ${selectedBrand === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Brands
            </button>
            {CIGAR_BRANDS.map(b => {
              const isSel = selectedBrand.toLowerCase().includes(b.name.toLowerCase()) || 
                            b.name.toLowerCase().includes(selectedBrand.toLowerCase());
              return (
                <button
                  key={b.slug}
                  onClick={() => setSelectedBrand(b.name)}
                  className={`btn btn-sm ${isSel ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
            Loading Cuban cigar catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <AlertCircle size={44} style={{ color: 'var(--accent-amber)', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>No cigars match your search</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Try clearing filters or searching for a different brand or product name.
            </p>
            <button className="btn btn-outline" onClick={() => { setSelectedBrand('all'); setSearchQuery(''); setInStockOnly(false); }}>
              Reset All Filters
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Showing {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
            </div>
            <div className="grid-responsive">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id || product.slug}
                  product={product}
                  onOpenNotifyModal={(p) => setSelectedNotifyProduct(p)}
                />
              ))}
            </div>
          </div>
        )}
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
