import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const VISIBLE_MS = 59 * 60 * 1000;
const BATCH_LIMIT = 400;

const FIRST_NAMES = [
  "James", "Olivia", "Liam", "Charlotte", "Noah", "Amelia", "William", "Ava",
  "Jack", "Mia", "Oliver", "Isla", "Thomas", "Grace", "Henry", "Chloe",
  "Lucas", "Sophie", "Ethan", "Emily", "Mason", "Harper", "Alexander", "Ella",
  "Benjamin", "Zoe", "Samuel", "Lily", "Daniel", "Hannah", "Matthew", "Ruby",
  "Joseph", "Eva", "David", "Scarlett", "Andrew", "Willow", "Nathan", "Ivy",
  "Ryan", "Matilda", "Joshua", "Sienna", "Luke", "Audrey", "Dylan", "Freya",
  "Connor", "Georgia", "Patrick", "Claire", "Sean", "Natalie", "Callum", "Brooke",
  "Harrison", "Phoebe", "Archie", "Lucy", "Hugo", "Alice", "Felix", "Emma",
  "Oscar", "Sarah", "Leo", "Kate", "Max", "Anna", "Charlie", "Laura",
  "Harvey", "Nina", "Edward", "Maya", "George", "Priya", "Harry", "Aisha",
  "Theo", "Leah", "Adam", "Sofia", "Michael", "Elena", "Chris", "Hannah",
  "Ben", "Rachel", "Tom", "Jessica", "Alex", "Megan", "Sam", "Lauren",
];

type EventType = "order" | "newsletter" | "stock_notify" | "site_viewers";

type CatalogProduct = {
  name: string;
  slug: string;
};

export type SocialProofGenerateResult = {
  created: number;
  deletedExpired: number;
  written: EventType[];
};

/** Expected generated writes per hour, applied independently each minute. */
const MINUTE_RATES: Record<Exclude<EventType, "site_viewers">, number> = {
  order: 2 / 60,
  newsletter: 1 / 60,
  stock_notify: 3 / 60,
};

function getDb() {
  return admin.firestore();
}

export function firstNameFromFullName(name: unknown): string {
  const raw = typeof name === "string" ? name.trim() : "";
  if (!raw) return "Someone";
  const token = raw.split(/\s+/)[0] ?? "";
  if (!token) return "Someone";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/** Order toasts only show the state — never suburb / city detail. */
export function formatNswSocialProofLocation(_address?: unknown): string {
  return "NSW";
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function loadCatalogProducts(
  stockFilter: "in_stock" | "out_of_stock",
): Promise<CatalogProduct[]> {
  const snap = await getDb().collection("products").get();
  const products: CatalogProduct[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active === false) return;
    const stock = typeof data.stock === "number" ? data.stock : 0;
    if (stockFilter === "in_stock" && stock <= 0) return;
    if (stockFilter === "out_of_stock" && stock > 0) return;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) return;
    const slug = typeof data.slug === "string" && data.slug.trim()
      ? data.slug.trim()
      : docSnap.id;
    products.push({ name, slug });
  });
  return products;
}

async function loadInStockProducts(): Promise<CatalogProduct[]> {
  return loadCatalogProducts("in_stock");
}

async function loadOutOfStockProducts(): Promise<CatalogProduct[]> {
  return loadCatalogProducts("out_of_stock");
}

export async function cleanupExpiredSocialProof(now = Date.now()): Promise<number> {
  const db = getDb();
  const cutoff = admin.firestore.Timestamp.fromMillis(now - VISIBLE_MS);
  const snap = await db.collection("social_proof").where("displayAt", "<", cutoff).get();
  if (snap.empty) return 0;

  let deleted = 0;
  let batch = db.batch();
  let pending = 0;

  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    pending += 1;
    deleted += 1;
    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  return deleted;
}

function blankGeneratedEntry(
  eventType: EventType,
  now: number,
): Record<string, unknown> {
  return {
    eventType,
    firstName: "",
    location: "",
    productName: "",
    productSlug: "",
    displayAt: admin.firestore.Timestamp.fromMillis(now),
    source: "generated",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * One minute of generated base social proof.
 * Independent Bernoulli draws so hourly expectations are ~2 orders,
 * ~1 newsletter, and ~3 stock-notify. Viewer counts are published by
 * publishLiveSiteViewersSocialProof (not historical feed rows).
 * Empty product pools skip that draw.
 */
export async function generateMinuteSocialProofFeed(now = Date.now()): Promise<SocialProofGenerateResult> {
  const deletedExpired = await cleanupExpiredSocialProof(now);
  const inStockProducts = await loadInStockProducts();
  const outOfStockProducts = await loadOutOfStockProducts();
  const db = getDb();
  const written: EventType[] = [];

  const shouldWrite = (eventType: keyof typeof MINUTE_RATES) =>
    Math.random() < MINUTE_RATES[eventType];

  if (shouldWrite("order") && inStockProducts.length > 0) {
    const product = pick(inStockProducts);
    const entry = blankGeneratedEntry("order", now);
    entry.firstName = pick(FIRST_NAMES);
    entry.location = "NSW";
    entry.productName = product.name;
    entry.productSlug = product.slug;
    await db.collection("social_proof").add(entry);
    written.push("order");
  }

  if (shouldWrite("newsletter")) {
    const entry = blankGeneratedEntry("newsletter", now);
    entry.firstName = pick(FIRST_NAMES);
    entry.location = "";
    await db.collection("social_proof").add(entry);
    written.push("newsletter");
  }

  if (shouldWrite("stock_notify") && outOfStockProducts.length > 0) {
    const product = pick(outOfStockProducts);
    const entry = blankGeneratedEntry("stock_notify", now);
    entry.firstName = pick(FIRST_NAMES);
    entry.location = "";
    entry.productName = product.name;
    entry.productSlug = product.slug;
    await db.collection("social_proof").add(entry);
    written.push("stock_notify");
  }

  logger.info(`Minute social proof wrote ${written.length} entries.`, { written, deletedExpired });
  return { created: written.length, deletedExpired, written };
}

export function firstNameFromEmail(email: unknown): string {
  if (typeof email !== "string") return "Someone";
  const local = email.trim().split("@")[0] ?? "";
  const withoutPlus = local.split("+")[0] ?? "";
  const token = withoutPlus.split(/[._-]/)[0] ?? "";
  if (!token || token.length < 2 || /^\d+$/.test(token)) return "Someone";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

async function resolveProductFields(
  productId: string,
  fallbackName: string,
): Promise<{ productName: string; productSlug: string }> {
  let productName = fallbackName.trim() || "a cigar";
  let productSlug = "";
  if (!productId) return { productName, productSlug };

  try {
    const productSnap = await getDb().collection("products").doc(productId).get();
    if (productSnap.exists) {
      const product = productSnap.data() ?? {};
      if (typeof product.name === "string" && product.name.trim()) {
        productName = product.name.trim();
      }
      if (typeof product.slug === "string" && product.slug.trim()) {
        productSlug = product.slug.trim();
      } else {
        productSlug = productId;
      }
      return { productName, productSlug };
    }

    // stockNotifications may store slug as productId when the catalog id is missing
    const bySlug = await getDb().collection("products").where("slug", "==", productId).limit(1).get();
    const slugDoc = bySlug.docs[0];
    if (slugDoc) {
      const product = slugDoc.data() ?? {};
      if (typeof product.name === "string" && product.name.trim()) {
        productName = product.name.trim();
      }
      productSlug = typeof product.slug === "string" && product.slug.trim()
        ? product.slug.trim()
        : productId;
    } else if (!productSlug && productId) {
      productSlug = productId;
    }
  } catch (err) {
    logger.warn("Social proof product lookup failed; writing entry without slug.", err);
  }

  return { productName, productSlug };
}

async function resolvePersonFromUserOrEmail(
  userId: unknown,
  email: unknown,
): Promise<{ firstName: string; location: string }> {
  if (typeof userId === "string" && userId) {
    try {
      const snap = await getDb().collection("users").doc(userId).get();
      if (snap.exists) {
        const data = snap.data() ?? {};
        const firstName = firstNameFromFullName(data.displayName);
        return {
          firstName: firstName !== "Someone" ? firstName : firstNameFromEmail(email),
          // Newsletter / stock-notify toasts do not show location.
          location: "",
        };
      }
    } catch (err) {
      logger.warn("Social proof user lookup failed; falling back to email.", err);
    }
  }

  return {
    firstName: firstNameFromEmail(email),
    location: "",
  };
}

export async function writeOrderSocialProof(orderData: admin.firestore.DocumentData): Promise<void> {
  const db = getDb();
  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const first = items[0] && typeof items[0] === "object"
    ? items[0] as Record<string, unknown>
    : undefined;

  const fallbackName = typeof first?.name === "string" && first.name.trim()
    ? first.name.trim()
    : "a cigar";
  const productId = typeof first?.productId === "string" ? first.productId : "";
  const { productName, productSlug } = await resolveProductFields(productId, fallbackName);

  await db.collection("social_proof").add({
    eventType: "order",
    firstName: firstNameFromFullName(orderData.customerName),
    location: formatNswSocialProofLocation(orderData.deliveryAddress),
    productName,
    productSlug,
    displayAt: admin.firestore.Timestamp.now(),
    source: "order",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function writeNewsletterSocialProof(
  subscriberData: admin.firestore.DocumentData,
): Promise<void> {
  const { firstName, location } = await resolvePersonFromUserOrEmail(
    subscriberData.userId,
    subscriberData.email,
  );

  await getDb().collection("social_proof").add({
    eventType: "newsletter",
    firstName,
    location,
    productName: "",
    productSlug: "",
    displayAt: admin.firestore.Timestamp.now(),
    source: "newsletter",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function writeStockNotifySocialProof(
  notifData: admin.firestore.DocumentData,
): Promise<void> {
  const productId = typeof notifData.productId === "string" ? notifData.productId : "";
  const fallbackName = typeof notifData.productName === "string" ? notifData.productName : "a cigar";
  const { productName, productSlug } = await resolveProductFields(productId, fallbackName);
  const resolved = await resolvePersonFromUserOrEmail(
    notifData.userId ?? notifData.customerId,
    notifData.email,
  );
  const submittedName = firstNameFromFullName(notifData.name);
  const firstName = submittedName !== "Someone" ? submittedName : resolved.firstName;
  const location = resolved.location;

  await getDb().collection("social_proof").add({
    eventType: "stock_notify",
    firstName,
    location,
    productName,
    productSlug,
    displayAt: admin.firestore.Timestamp.now(),
    source: "stock_notify",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

const SITE_PRESENCE_STALE_MS = 90_000;
const VIEWER_BASE_MIN = 5;
const VIEWER_BASE_MAX = 12;
/** Single current count the storefront toast subscribes to (not a feed history row). */
export const LIVE_SITE_VIEWERS_DOC = "social_proof_live/site_viewers";

/**
 * Page-type mix for generated viewers. Home / shop / news are silent sinks.
 * The products share is then fanned out across catalog ids.
 */
const SINK_WEIGHTS = { home: 20, shop: 20, news: 10 } as const;
const PRODUCTS_POOL_WEIGHT = 50;
const IN_STOCK_WEIGHT = 8;
const LOW_STOCK_WEIGHT = 12;
const OUT_OF_STOCK_WEIGHT = 1;
const LOW_STOCK_THRESHOLD = 20;

export type ViewerSinks = { home: number; shop: number; news: number };

export type AllocatableProduct = { id: string; stock: number };

export type ViewerAllocation = {
  sinks: ViewerSinks;
  products: Record<string, number>;
};

function rollViewerBase(): number {
  return VIEWER_BASE_MIN
    + Math.floor(Math.random() * (VIEWER_BASE_MAX - VIEWER_BASE_MIN + 1));
}

function productViewerWeight(stock: number): number {
  if (stock > 0 && stock < LOW_STOCK_THRESHOLD) return LOW_STOCK_WEIGHT;
  if (stock > 0) return IN_STOCK_WEIGHT;
  return OUT_OF_STOCK_WEIGHT;
}

function weightedPick<T extends { weight: number }>(items: T[], random: () => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return items[items.length - 1];
  let roll = random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Spread exactly `baseCount` generated viewers across silent sinks and products.
 * Real presence is not included — callers add live sessions on top.
 */
export function allocateGeneratedViewers(
  baseCount: number,
  products: AllocatableProduct[],
  random: () => number = Math.random,
): ViewerAllocation {
  const count = Math.max(0, Math.floor(baseCount));
  const sinks: ViewerSinks = { home: 0, shop: 0, news: 0 };
  const productCounts = new Map<string, number>();
  const eligible = products.filter((product) => product.id.trim().length > 0);

  const buckets: { key: "home" | "shop" | "news" | "products"; weight: number }[] = [
    { key: "home", weight: SINK_WEIGHTS.home },
    { key: "shop", weight: SINK_WEIGHTS.shop },
    { key: "news", weight: SINK_WEIGHTS.news },
  ];
  if (eligible.length > 0) {
    buckets.push({ key: "products", weight: PRODUCTS_POOL_WEIGHT });
  }

  const productSlots = eligible.map((product) => ({
    id: product.id,
    weight: productViewerWeight(product.stock),
  }));

  for (let i = 0; i < count; i += 1) {
    const bucket = weightedPick(buckets, random);
    if (bucket.key === "products") {
      const picked = weightedPick(productSlots, random);
      productCounts.set(picked.id, (productCounts.get(picked.id) ?? 0) + 1);
      continue;
    }
    sinks[bucket.key] += 1;
  }

  const allocatedProducts: Record<string, number> = {};
  for (const [id, viewers] of productCounts) {
    if (viewers > 0) allocatedProducts[id] = viewers;
  }

  return { sinks, products: allocatedProducts };
}

async function loadAllocatableProducts(): Promise<AllocatableProduct[]> {
  const snap = await getDb().collection("products").get();
  const products: AllocatableProduct[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active === false) return;
    const stock = typeof data.stock === "number" && Number.isFinite(data.stock)
      ? data.stock
      : 0;
    products.push({ id: docSnap.id, stock });
  });
  return products;
}

/**
 * Prune stale site-presence docs, then publish display viewer count:
 * a freshly rolled base (5–12) allocated across silent sinks + products,
 * plus real live presence on the site total. Clients read the single
 * social_proof_live/site_viewers doc — they do not invent the base themselves.
 */
export async function publishLiveSiteViewersSocialProof(
  now = Date.now(),
): Promise<{
  written: boolean;
  viewerCount: number;
  baseCount: number;
  liveCount: number;
  deletedStale: number;
  sinks: ViewerSinks;
  allocatedProducts: number;
}> {
  const db = getDb();
  const snap = await db.collection("sitePresence").get();
  let liveCount = 0;
  let deletedStale = 0;
  let batch = db.batch();
  let pending = 0;

  for (const docSnap of snap.docs) {
    const lastSeen = docSnap.data().lastSeen;
    const seenAt = lastSeen instanceof admin.firestore.Timestamp
      ? lastSeen.toMillis()
      : typeof lastSeen === "number"
        ? lastSeen
        : null;
    if (seenAt != null && now - seenAt < SITE_PRESENCE_STALE_MS) {
      liveCount += 1;
      continue;
    }

    batch.delete(docSnap.ref);
    pending += 1;
    deletedStale += 1;
    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();

  const baseCount = rollViewerBase();
  const catalog = await loadAllocatableProducts();
  const allocation = allocateGeneratedViewers(baseCount, catalog);
  const viewerCount = baseCount + liveCount;
  const liveRef = db.doc(LIVE_SITE_VIEWERS_DOC);

  await liveRef.set(
    {
      eventType: "site_viewers",
      viewerCount,
      baseCount,
      liveCount,
      sinks: allocation.sinks,
      products: allocation.products,
      baseAt: admin.firestore.Timestamp.fromMillis(now),
      displayAt: admin.firestore.Timestamp.fromMillis(now),
      source: "site_viewers",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    written: true,
    viewerCount,
    baseCount,
    liveCount,
    deletedStale,
    sinks: allocation.sinks,
    allocatedProducts: Object.keys(allocation.products).length,
  };
}
