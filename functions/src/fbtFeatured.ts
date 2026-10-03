import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

interface OrderLine {
  productId?: string;
  quantity?: number;
  price?: number;
}

interface AccessoryProduct {
  id: string;
  categoryKey: string;
  fbtFeatured?: boolean;
  name: string;
}

function sydneyYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month };
}

/** UTC instant for midnight on a Sydney calendar date. */
function sydneyMidnight(year: number, month: number, day: number): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(utcGuess)).map((part) => [part.type, part.value])
  );
  const sydneyAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return new Date(utcGuess - (sydneyAsUtc - utcGuess));
}

export async function assignMonthlyAccessoryFeatured(db: admin.firestore.Firestore): Promise<void> {
  const { year, month } = sydneyYearMonth(new Date());
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const rangeStart = sydneyMidnight(prevYear, prevMonth, 1).toISOString();
  const rangeEnd = sydneyMidnight(year, month, 1).toISOString();

  const [orderSnap, productSnap] = await Promise.all([
    db.collection("orders").where("createdAt", ">=", rangeStart).where("createdAt", "<", rangeEnd).get(),
    db.collection("products").where("category", "==", "accessories").get(),
  ]);

  const accessories = new Map<string, AccessoryProduct>();
  productSnap.forEach((entry) => {
    const data = entry.data();
    const categoryKey = String(data.catalogCategoryId || data.brand || "uncategorised").trim().toLowerCase();
    accessories.set(entry.id, {
      id: entry.id,
      categoryKey,
      fbtFeatured: data.fbtFeatured === true,
      name: String(data.name || ""),
    });
  });

  const totals = new Map<string, { units: number; revenue: number }>();
  orderSnap.forEach((entry) => {
    const order = entry.data();
    if (order.status === "Cancelled" || order.source === "Reward") return;
    const items = (order.items || []) as OrderLine[];
    items.forEach((item) => {
      if (!item.productId || !accessories.has(item.productId)) return;
      const current = totals.get(item.productId) || { units: 0, revenue: 0 };
      const quantity = Number(item.quantity) || 0;
      current.units += quantity;
      current.revenue += quantity * (Number(item.price) || 0);
      totals.set(item.productId, current);
    });
  });

  const byCategory = new Map<string, string[]>();
  accessories.forEach((product) => {
    if (!totals.has(product.id)) return;
    const list = byCategory.get(product.categoryKey) || [];
    list.push(product.id);
    byCategory.set(product.categoryKey, list);
  });

  const writes: Array<{ id: string; featured: boolean }> = [];
  byCategory.forEach((ids, categoryKey) => {
    const ranked = [...ids].sort((leftId, rightId) => {
      const left = totals.get(leftId)!;
      const right = totals.get(rightId)!;
      if (right.units !== left.units) return right.units - left.units;
      if (right.revenue !== left.revenue) return right.revenue - left.revenue;
      const leftName = accessories.get(leftId)?.name || "";
      const rightName = accessories.get(rightId)?.name || "";
      return leftName.localeCompare(rightName);
    });
    const winnerId = ranked[0];
    logger.info(`Featured accessory for ${categoryKey}: ${winnerId}`);
    accessories.forEach((product) => {
      if (product.categoryKey !== categoryKey) return;
      const featured = product.id === winnerId;
      if (product.fbtFeatured === featured) return;
      writes.push({ id: product.id, featured });
    });
  });

  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch();
    writes.slice(index, index + 400).forEach((write) => {
      batch.update(db.collection("products").doc(write.id), { fbtFeatured: write.featured });
    });
    await batch.commit();
  }

  logger.info(`Updated featured flags on ${writes.length} accessory product(s) for ${prevYear}-${prevMonth}.`);
}
