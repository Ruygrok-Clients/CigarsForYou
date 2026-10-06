import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { CatalogCategory, Product, ProductRange } from '../types';
import { ProductCard } from '../components/ProductCard';
import { StockNotificationModal } from '../components/StockNotificationModal';
import { RangeComingSoon } from '../components/RangeComingSoon';
import { brandCatalogueCopy, DEFAULT_CIGAR_CATEGORIES, RANGE_CATALOGUE, rangeBasePath, slugifyLabel } from '../constants/productRanges';
import { fetchCatalogCategories, fetchProducts, isPublishedProduct } from '../services/catalog';
import {
  Search,
  SlidersHorizontal,
  AlertCircle,
  Flame,
  Tag
} from 'lucide-react';
import { trackSearch, trackViewItemList } from '../lib/analytics';
import { absoluteCanonical, applySeo, categoryDescription } from '../lib/seo';

export const ProductRangePage: React.FC<{ range: ProductRange }> = ({ range }) => {
  const params = useParams<{ brandSlug?: string; categorySlug?: string }>();
  const categorySlug = params.categorySlug || params.brandSlug;
  const copy = RANGE_CATALOGUE[range];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [selectedNotifyProduct, setSelectedNotifyProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const productList = await fetchProducts();
        if (cancelled) return;
        setProducts(productList.filter((product) => isPublishedProduct(product, range)));
      } catch (err) {
        console.error('Error fetching range products:', err);
        if (!cancelled) setProducts([]);
      }
      try {
        const categoryList = await fetchCatalogCategories(range);
        if (!cancelled) setCategories(categoryList);
      } catch (err) {
        console.error('Error fetching range categories:', err);
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const sidebarCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((item) => ({ name: item.name, slug: item.slug }));
    }
    if (range === 'cigars') return DEFAULT_CIGAR_CATEGORIES;
    return [];
  }, [categories, range]);

  const searchQuery = searchParams.get('search') || '';
  const matchedCategory = categorySlug
    ? sidebarCategories.find((item) => item.slug.toLowerCase() === categorySlug.toLowerCase())
    : undefined;
  const selectedCategory = matchedCategory?.name || (categorySlug ? categorySlug : 'all');

  useEffect(() => {
    const brandParam = (searchParams.get('brand') || '').trim();
    const categoryParam = (searchParams.get('category') || '').trim();
    if (!brandParam && !categoryParam) return;
    const next = new URLSearchParams(searchParams);
    next.delete('brand');
    next.delete('category');
    const brandMatch = brandParam
      ? sidebarCategories.find((item) => (
        item.slug === slugifyLabel(brandParam) || item.name.toLowerCase() === brandParam.toLowerCase()
      ))
      : undefined;
    const slug = brandMatch?.slug || (brandParam ? slugifyLabel(brandParam) : '');
    const path = slug ? `${rangeBasePath(range)}/${slug}` : rangeBasePath(range);
    const search = next.toString();
    navigate(search ? `${path}?${search}` : path, { replace: true });
  }, [navigate, range, searchParams, sidebarCategories]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('search', val.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleResetFilters = () => {
    setInStockOnly(false);
    navigate(rangeBasePath(range));
  };

  const categoriesList = useMemo(() => {
    const getCount = (name: string) => {
      if (name === 'all') return products.length;
      return products.filter((product) => product.brand.toLowerCase().includes(name.toLowerCase())).length;
    };

    return [
      { name: copy.allLabel, slug: 'all', count: products.length },
      ...sidebarCategories
        .map((item) => ({
          name: item.name,
          slug: item.slug,
          count: getCount(item.name)
        }))
        .filter((item) => item.count > 0)
    ];
  }, [products, sidebarCategories, copy.allLabel]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (selectedCategory !== 'all') {
        const productBrand = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
        const selected = selectedCategory.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!productBrand.includes(selected) && !selected.includes(productBrand)) {
          return false;
        }
      }

      if (inStockOnly && product.stock <= 0) return false;

      if (searchQuery.trim()) {
        const words = searchQuery.toLowerCase().trim().split(/\s+/);
        const searchable = `${product.brand} ${product.name} ${product.shortDescription || ''} ${product.extendedDescription || ''} ${product.origin || ''} ${product.category || ''}`.toLowerCase();
        if (!words.every((word) => searchable.includes(word))) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [products, selectedCategory, inStockOnly, searchQuery, sortBy]);

  const listName = selectedCategory === 'all' ? copy.title : `${selectedCategory} ${copy.titledSuffix}`;

  useEffect(() => {
    if (loading || products.length === 0 || filteredProducts.length === 0) return;
    trackViewItemList(range, listName, filteredProducts);
  }, [loading, products.length, filteredProducts, range, listName]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (!term || loading) return;
    const timer = window.setTimeout(() => {
      trackSearch(term, 'catalog');
    }, 700);
    return () => window.clearTimeout(timer);
  }, [searchQuery, loading]);

  useLayoutEffect(() => {
    const base = rangeBasePath(range);
    const matched = categorySlug
      ? sidebarCategories.find((item) => item.slug.toLowerCase() === categorySlug.toLowerCase())
      : undefined;
    const brandParam = (searchParams.get('brand') || '').trim();
    const brandMatch = brandParam
      ? sidebarCategories.find((item) => (
        item.slug === slugifyLabel(brandParam) || item.name.toLowerCase() === brandParam.toLowerCase()
      ))
      : undefined;
    const cleanPath = matched
      ? `${base}/${matched.slug}`
      : brandMatch
        ? `${base}/${brandMatch.slug}`
        : base;
    const title = matched
      ? `${matched.name} ${copy.titledSuffix} | Cigars For You`
      : `${copy.title} | Cigars For You`;
    const description = categoryDescription(range, matched?.slug || brandMatch?.slug);
    const paramTrap = ['search', 'brand', 'category'].some((key) => (searchParams.get(key) || '').trim());

    if (loading) {
      applySeo({
        title,
        description,
        robots: 'noindex,follow',
        canonical: absoluteCanonical(paramTrap ? cleanPath : base),
      });
      return;
    }

    const countFor = (name: string) => products.filter((product) => {
      const productBrand = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
      const selected = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return productBrand.includes(selected) || selected.includes(productBrand);
    }).length;

    if (products.length === 0) {
      applySeo({
        title: `${copy.title} | Cigars For You`,
        description: categoryDescription(range),
        robots: 'noindex,follow',
        canonical: categorySlug ? null : absoluteCanonical(base),
      });
      return;
    }

    if (categorySlug && !matched) {
      applySeo({ title, description: null, robots: 'noindex,follow', canonical: null });
      return;
    }

    const brandCount = matched ? countFor(matched.name) : products.length;
    if (paramTrap) {
      const target = matched && brandCount === 0 ? base : cleanPath;
      applySeo({ title, description, robots: 'noindex,follow', canonical: absoluteCanonical(target) });
      return;
    }

    if (matched && brandCount === 0) {
      applySeo({ title, description, robots: 'noindex,follow', canonical: absoluteCanonical(cleanPath) });
      return;
    }

    applySeo({ title, description, robots: 'index,follow', canonical: absoluteCanonical(cleanPath) });
  }, [loading, products, sidebarCategories, categorySlug, searchParams, range, copy]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f9f8f6', minHeight: '100vh', padding: '5rem 0', textAlign: 'center', color: '#8c8c8e' }}>
        {copy.loading}
      </div>
    );
  }

  if (products.length === 0) {
    return <RangeComingSoon range={range} />;
  }

  const heading = listName;

  return (
    <div style={{ backgroundColor: '#f9f8f6', minHeight: '100vh', padding: '2.5rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '1280px' }}>
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
            {copy.eyebrow}
          </span>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.6rem)',
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 0.6rem 0'
          }}>
            {heading}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ color: '#515154', fontSize: '1rem', margin: 0, lineHeight: 1.5 }}>
              {brandCatalogueCopy(matchedCategory?.slug)?.blurb || copy.blurb(products.length)}
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

        <div style={{ height: '1px', backgroundColor: '#e5e2da', width: '100%', marginBottom: '2.5rem' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 270px) 1fr', gap: '2.5rem', alignItems: 'start' }} className="catalog-grid-layout">
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
              {categoriesList.map((cat) => {
                const isSelected = cat.slug === 'all'
                  ? selectedCategory === 'all'
                  : selectedCategory.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cat.slug.toLowerCase().replace(/[^a-z0-9]/g, ''))
                    || cat.name.toLowerCase() === selectedCategory.toLowerCase();
                const Icon = cat.slug === 'all' ? Flame : Tag;

                const href = cat.slug === 'all' ? rangeBasePath(range) : `${rangeBasePath(range)}/${cat.slug}`;

                return (
                  <Link
                    key={cat.slug}
                    to={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: isSelected ? '0.75rem 1rem' : '0.65rem 0.85rem',
                      borderRadius: isSelected ? '12px' : '10px',
                      backgroundColor: isSelected ? '#ffffff' : 'transparent',
                      border: isSelected ? '1.5px solid #e2ded5' : 'none',
                      boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.04)' : 'none',
                      color: isSelected ? '#1a1a1a' : '#515154',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      textDecoration: 'none',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#efece6';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Icon size={18} style={{ color: isSelected ? '#c06517' : '#71717a' }} />
                      <span>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1a1a1a' : '#8c8c8e' }}>
                      {cat.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </aside>

          <main>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
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
                  placeholder={copy.searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                />
              </div>

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
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#71717a', marginBottom: '1.5rem' }}>
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
            </div>

            {filteredProducts.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2ded5',
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <AlertCircle size={44} style={{ color: '#c06517', margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.4rem', color: '#1a1a1a', marginBottom: '0.5rem' }}>{copy.emptyTitle}</h3>
                <p style={{ color: '#515154', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  {copy.emptyBody}
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
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id || product.slug}
                    product={product}
                    listId={range}
                    listName={listName}
                    imageLoading={index < 4 ? 'eager' : 'lazy'}
                    onOpenNotifyModal={(item) => setSelectedNotifyProduct(item)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedNotifyProduct && (
        <StockNotificationModal
          product={selectedNotifyProduct}
          onClose={() => setSelectedNotifyProduct(null)}
        />
      )}
    </div>
  );
};
