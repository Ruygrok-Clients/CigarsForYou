import { useEffect, useState } from 'react';
import { CIGAR_BRANDS } from '../constants/productRanges';
import { fetchCatalogCategories } from '../services/catalog';

export function useCigarCategories() {
  const [categories, setCategories] = useState(CIGAR_BRANDS);

  useEffect(() => {
    let cancelled = false;
    fetchCatalogCategories('cigars')
      .then((list) => {
        if (cancelled || list.length === 0) return;
        setCategories(list.map((item) => ({ name: item.name, slug: item.slug })));
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
