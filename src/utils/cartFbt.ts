import type { Product } from '../types';

const DEFAULT_LIMIT = 12;

/** Companions stored on cart products, ranked by how many cart lines list them. */
export function selectCartFrequentlyBoughtTogether(
  cartProducts: Array<Pick<Product, 'id' | 'fbtCompanionIds'>>,
  catalog: Product[],
  limit = DEFAULT_LIMIT
): Product[] {
  const inCart = new Set(cartProducts.map((product) => product.id).filter((id): id is string => Boolean(id)));
  const scores = new Map<string, number>();

  for (const product of cartProducts) {
    const seen = new Set<string>();
    for (const id of product.fbtCompanionIds || []) {
      if (!id || inCart.has(id) || seen.has(id)) continue;
      seen.add(id);
      scores.set(id, (scores.get(id) || 0) + 1);
    }
  }

  const byId = new Map<string, Product>();
  for (const product of catalog) {
    if (!product.id || product.active !== true || (product.stock ?? 0) <= 0) continue;
    if (inCart.has(product.id)) continue;
    byId.set(product.id, product);
  }

  return [...scores.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (byId.get(a[0])?.name || '').localeCompare(byId.get(b[0])?.name || '');
    })
    .map(([id]) => byId.get(id))
    .filter((product): product is Product => Boolean(product))
    .slice(0, limit);
}
