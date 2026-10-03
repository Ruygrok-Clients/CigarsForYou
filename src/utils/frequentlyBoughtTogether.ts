import type { Product, ProductRange } from '../types';
import { productMatchesRange } from '../constants/productRanges';

const FEATURED_WEIGHT = 1.5;

function categoryKey(product: Product): string {
  return (product.catalogCategoryId || product.brand || 'uncategorised').trim().toLowerCase();
}

function productKey(product: Product): string {
  return product.id || product.slug;
}

function isInStock(product: Product): boolean {
  return product.active === true && product.stock > 0;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickWeighted(products: Product[]): Product {
  const weights = products.map((product) => (product.fbtFeatured ? FEATURED_WEIGHT : 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < products.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return products[index];
  }
  return products[products.length - 1];
}

function groupByCategory(products: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>();
  products.forEach((product) => {
    const key = categoryKey(product);
    const list = groups.get(key) || [];
    list.push(product);
    groups.set(key, list);
  });
  return groups;
}

function pickAccessories(pool: Product[], limit: number, usedCategories: Set<string>): Product[] {
  const groups = groupByCategory(pool.filter((product) => !usedCategories.has(categoryKey(product))));
  const keys = Array.from(groups.keys());
  for (let index = keys.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [keys[index], keys[swap]] = [keys[swap], keys[index]];
  }
  const chosen: Product[] = [];
  keys.forEach((key) => {
    if (chosen.length >= limit) return;
    const group = groups.get(key);
    if (!group || group.length === 0) return;
    chosen.push(pickWeighted(group));
  });
  return chosen;
}

/** One same-range companion when one exists, then matched accessories. One accessory per category. */
export function selectFrequentlyBoughtTogether(current: Product, catalog: Product[]): Product[] {
  const pageRange: ProductRange = current.category || 'cigars';
  const currentId = productKey(current);
  const others = catalog.filter((product) => isInStock(product) && productKey(product) !== currentId);

  const sameRange = others.filter((product) => productMatchesRange(product.category, pageRange));
  const sameRangePool = pageRange === 'accessories'
    ? sameRange.filter((product) => categoryKey(product) !== categoryKey(current))
    : sameRange;

  let companion: Product | null = null;
  if (sameRangePool.length > 0) {
    companion = pageRange === 'accessories'
      ? pickAccessories(sameRangePool, 1, new Set())[0] || null
      : pickRandom(sameRangePool);
  }

  const usedCategories = new Set<string>();
  if (pageRange === 'accessories') usedCategories.add(categoryKey(current));
  if (companion && companion.category === 'accessories') usedCategories.add(categoryKey(companion));

  const matched = others.filter((product) => (
    product.category === 'accessories'
    && (product.fbtRanges || []).includes(pageRange)
    && (!companion || productKey(product) !== productKey(companion))
  ));

  const accessories = pickAccessories(matched, companion ? 2 : 3, usedCategories);
  return companion ? [companion, ...accessories] : accessories;
}
