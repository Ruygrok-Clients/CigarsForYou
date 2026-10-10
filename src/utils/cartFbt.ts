import type { Product } from '../types';

const DEFAULT_LIMIT = 12;

function isEligibleCatalogProduct(product: Product, inCart: Set<string>): boolean {
  return Boolean(
    product.id
    && product.active === true
    && (product.stock ?? 0) > 0
    && !inCart.has(product.id)
  );
}

/** Companions on cart lines first; fill remaining slots from popular in-stock catalog. */
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
    if (!isEligibleCatalogProduct(product, inCart) || !product.id) continue;
    byId.set(product.id, product);
  }

  const fromCompanions = [...scores.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (byId.get(a[0])?.name || '').localeCompare(byId.get(b[0])?.name || '');
    })
    .map(([id]) => byId.get(id))
    .filter((product): product is Product => Boolean(product));

  if (fromCompanions.length >= limit) {
    return fromCompanions.slice(0, limit);
  }

  const used = new Set(fromCompanions.map((product) => product.id).filter((id): id is string => Boolean(id)));
  const fillers = [...byId.values()]
    .filter((product) => product.id && !used.has(product.id))
    .sort((a, b) => {
      const countDiff = (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0);
      if (countDiff !== 0) return countDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

  return [...fromCompanions, ...fillers].slice(0, limit);
}
