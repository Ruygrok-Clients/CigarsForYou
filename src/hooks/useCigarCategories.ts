import { useEffect, useState } from 'react';
import { CIGAR_BRANDS } from '../constants/productRanges';
import { fetchCatalogCategories, fetchProducts, isPublishedProduct, productUsesCategory } from '../services/catalog';
import type { CatalogCategory, Product } from '../types';

function withProducts(categories: CatalogCategory[], products: Product[]) {
  const published = products.filter((product) => isPublishedProduct(product, 'cigars') && product.active === true);
  return categories.filter((category) => published.some((product) => productUsesCategory(product, category)));
}

export function useCigarCategories() {
  const [categories, setCategories] = useState(CIGAR_BRANDS);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCatalogCategories('cigars'), fetchProducts()])
      .then(([list, products]) => {
        if (cancelled) return;
        const source: CatalogCategory[] = list.length > 0
          ? list
          : CIGAR_BRANDS.map((item, index) => ({
            range: 'cigars',
            name: item.name,
            slug: item.slug,
            sortOrder: index
          }));
        const stocked = withProducts(source, products);
        if (stocked.length === 0) return;
        setCategories(stocked.map((item) => ({ name: item.name, slug: item.slug })));
      })
      .catch((err) => {
        console.error('Error loading cigar categories:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
