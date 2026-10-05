import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

export interface FbtCatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  active: boolean;
  fbtRanges: string[];
  fbtDefaultIds: string[];
  fbtStat?: number;
}

interface OrderLine {
  productId?: string;
}

const COMPANION_LIMIT = 3;

function sourceRange(product: FbtCatalogProduct): string {
  return product.category || "cigars";
}

function isTobacco(category: string): boolean {
  return category === "cigars" || category === "cigarettes";
}

function accessoryPreference(source: FbtCatalogProduct, candidate: FbtCatalogProduct, chosen: FbtCatalogProduct[]): number {
  const alreadyHasTobacco = chosen.some((product) => isTobacco(product.category));
  if (!alreadyHasTobacco) return 0;
  if (candidate.category === "accessories" && candidate.fbtRanges.includes(sourceRange(source))) return 1;
  return 0;
}

function pickFromOrders(
  source: FbtCatalogProduct,
  ordered: FbtCatalogProduct[],
  counts: Map<string, number>
): FbtCatalogProduct[] {
  const remaining = ordered.filter((product) => (counts.get(product.id) || 0) > 0);
  if (remaining.length >= COMPANION_LIMIT) {
    const chosen: FbtCatalogProduct[] = [];
    const pool = [...remaining];
    while (chosen.length < COMPANION_LIMIT && pool.length > 0) {
      const bestCount = Math.max(...pool.map((product) => counts.get(product.id) || 0));
      const tied = pool
        .filter((product) => (counts.get(product.id) || 0) === bestCount)
        .sort((left, right) => {
          const preference = accessoryPreference(source, right, chosen) - accessoryPreference(source, left, chosen);
          if (preference !== 0) return preference;
          return left.name.localeCompare(right.name);
        });
      const next = tied[0];
      chosen.push(next);
      pool.splice(pool.findIndex((product) => product.id === next.id), 1);
    }
    return chosen;
  }
  return remaining.sort((left, right) => (counts.get(right.id) || 0) - (counts.get(left.id) || 0));
}

function fillFromDefaults(
  source: FbtCatalogProduct,
  chosen: FbtCatalogProduct[],
  byId: Map<string, FbtCatalogProduct>,
  random: () => number
): string[] {
  const chosenIds = new Set(chosen.map((product) => product.id));
  const pool = source.fbtDefaultIds.filter((id) => {
    if (!id || id === source.id || chosenIds.has(id)) return false;
    const product = byId.get(id);
    return Boolean(product && product.active);
  });
  const next = [...chosenIds];
  const available = [...pool];
  while (next.length < COMPANION_LIMIT && available.length > 0) {
    const index = Math.floor(random() * available.length);
    const [id] = available.splice(index, 1);
    if (!next.includes(id)) next.push(id);
  }
  return next.slice(0, COMPANION_LIMIT);
}

export function chooseCompanionIds(
  source: FbtCatalogProduct,
  catalog: FbtCatalogProduct[],
  counts: Map<string, number>,
  random: () => number = Math.random
): string[] {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  const others = catalog.filter((product) => product.id !== source.id && product.active);
  const fromOrders = pickFromOrders(source, others, counts);
  if (fromOrders.length >= COMPANION_LIMIT) {
    return fromOrders.slice(0, COMPANION_LIMIT).map((product) => product.id);
  }
  return fillFromDefaults(source, fromOrders, byId, random);
}

export function pairCountsFromOrders(orders: Array<{ status?: string; items?: OrderLine[] }>): Map<string, Map<string, number>> {
  const pairs = new Map<string, Map<string, number>>();
  orders.forEach((order) => {
    if (order.status === "Cancelled") return;
    const ids = Array.from(new Set((order.items || []).map((item) => item.productId).filter((id): id is string => Boolean(id))));
    ids.forEach((left) => {
      ids.forEach((right) => {
        if (left === right) return;
        const row = pairs.get(left) || new Map<string, number>();
        row.set(right, (row.get(right) || 0) + 1);
        pairs.set(left, row);
      });
    });
  });
  return pairs;
}

function asProduct(id: string, data: admin.firestore.DocumentData): FbtCatalogProduct {
  const stat = data.fbtStat;
  return {
    id,
    name: String(data.name || ""),
    brand: String(data.brand || ""),
    category: String(data.category || "cigars"),
    active: data.active !== false,
    fbtRanges: Array.isArray(data.fbtRanges) ? data.fbtRanges.map(String) : [],
    fbtDefaultIds: Array.isArray(data.fbtDefaultIds) ? data.fbtDefaultIds.map(String) : [],
    fbtStat: typeof stat === "number" ? stat : undefined,
  };
}

export function starterDefaultIds(catalog: FbtCatalogProduct[]): string[] {
  const accessories = catalog.filter((product) => product.active && product.category === "accessories");
  const patterns = [/lighter/i, /cutter/i, /case|humidor|ashtray/i];
  const chosen: string[] = [];
  patterns.forEach((pattern) => {
    const match = accessories.find((product) => !chosen.includes(product.id) && pattern.test(`${product.brand} ${product.name}`));
    if (match) chosen.push(match.id);
  });
  accessories.forEach((product) => {
    if (chosen.length >= COMPANION_LIMIT) return;
    if (!chosen.includes(product.id)) chosen.push(product.id);
  });
  if (chosen.length < COMPANION_LIMIT) {
    catalog.filter((product) => product.active).forEach((product) => {
      if (chosen.length >= COMPANION_LIMIT + 1) return;
      if (!chosen.includes(product.id)) chosen.push(product.id);
    });
  }
  return chosen;
}

export async function rewriteFbtCompanions(db: admin.firestore.Firestore): Promise<number> {
  const [orderSnap, productSnap] = await Promise.all([
    db.collection("orders").get(),
    db.collection("products").get(),
  ]);
  const catalog = productSnap.docs.map((entry) => asProduct(entry.id, entry.data()));
  const pairs = pairCountsFromOrders(orderSnap.docs.map((entry) => entry.data()));
  const writes: Array<{ id: string; fbtCompanionIds: string[] }> = [];
  catalog.forEach((product) => {
    const counts = pairs.get(product.id) || new Map<string, number>();
    writes.push({
      id: product.id,
      fbtCompanionIds: chooseCompanionIds(product, catalog, counts),
    });
  });

  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch();
    writes.slice(index, index + 400).forEach((write) => {
      batch.update(db.collection("products").doc(write.id), { fbtCompanionIds: write.fbtCompanionIds });
    });
    await batch.commit();
  }
  logger.info(`Rewrote Frequently Bought Together companions on ${writes.length} product(s).`);
  return writes.length;
}
