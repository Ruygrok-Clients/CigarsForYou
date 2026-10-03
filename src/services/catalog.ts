import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { CatalogCategory, Product, ProductRange } from '../types';
import { DEFAULT_CIGAR_CATEGORIES, productMatchesRange, slugifyLabel } from '../constants/productRanges';

export async function fetchCatalogCategories(range?: ProductRange): Promise<CatalogCategory[]> {
  const snap = await getDocs(collection(db, 'catalogCategories'));
  const list: CatalogCategory[] = [];
  snap.forEach((entry) => {
    const data = entry.data() as Omit<CatalogCategory, 'id'>;
    if (range && data.range !== range) return;
    list.push({ id: entry.id, ...data, sortOrder: data.sortOrder ?? 0 });
  });
  list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return list;
}

export async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, 'products'));
  const list: Product[] = [];
  snap.forEach((entry) => {
    list.push({ id: entry.id, ...entry.data() } as Product);
  });
  return list;
}

export function isPublishedProduct(product: Product, range: ProductRange): boolean {
  return product.active === true && productMatchesRange(product.category, range);
}

export function productUsesCategory(product: Product, category: CatalogCategory): boolean {
  if (!productMatchesRange(product.category, category.range)) return false;
  if (category.id && product.catalogCategoryId === category.id) return true;
  return (product.brand || '').trim().toLowerCase() === category.name.trim().toLowerCase();
}

/** Writes the current cigar category names once. Does not create products. */
export async function ensureDefaultCigarCategories(products: Product[]): Promise<boolean> {
  const existing = await fetchCatalogCategories('cigars');
  if (existing.length > 0) return false;

  const seed = DEFAULT_CIGAR_CATEGORIES.map((item) => ({ ...item }));
  const known = new Set(seed.map((item) => item.name.toLowerCase()));

  products.forEach((product) => {
    if (!productMatchesRange(product.category, 'cigars')) return;
    const brand = product.brand?.trim();
    if (!brand || known.has(brand.toLowerCase())) return;
    known.add(brand.toLowerCase());
    seed.push({ name: brand, slug: slugifyLabel(brand) });
  });

  for (let index = 0; index < seed.length; index += 1) {
    const item = seed[index];
    await addDoc(collection(db, 'catalogCategories'), {
      range: 'cigars',
      name: item.name,
      slug: item.slug,
      sortOrder: index
    });
  }
  return true;
}
