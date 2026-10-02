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

const NSW_LOCATIONS = [
  "Sydney, NSW",
  "Newcastle, NSW",
  "Wollongong, NSW",
  "Parramatta, NSW",
  "Bondi, NSW",
  "Manly, NSW",
  "Surry Hills, NSW",
  "Newtown, NSW",
  "Bondi Junction, NSW",
  "Chatswood, NSW",
  "Penrith, NSW",
  "Cronulla, NSW",
  "Mosman, NSW",
  "Paddington, NSW",
  "Darlinghurst, NSW",
  "Randwick, NSW",
  "Coogee, NSW",
  "Balmain, NSW",
  "Leichhardt, NSW",
  "Marrickville, NSW",
  "Burwood, NSW",
  "Strathfield, NSW",
  "Hornsby, NSW",
  "Ryde, NSW",
  "Liverpool, NSW",
  "Campbelltown, NSW",
  "Gosford, NSW",
  "Coffs Harbour, NSW",
  "Port Macquarie, NSW",
  "Byron Bay, NSW",
  "Orange, NSW",
  "Bathurst, NSW",
  "Wagga Wagga, NSW",
  "Albury, NSW",
  "Dubbo, NSW",
  "Tamworth, NSW",
  "Lismore, NSW",
  "Nowra, NSW",
  "Katoomba, NSW",
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
const MINUTE_RATES: Record<EventType, number> = {
  order: 2 / 60,
  newsletter: 1 / 60,
  stock_notify: 3 / 60,
  site_viewers: 6 / 60,
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

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Coarse NSW label only. Other states are never shown. */
export function formatNswSocialProofLocation(address: unknown): string {
  if (!address || typeof address !== "object") return "NSW";
  const record = address as Record<string, unknown>;
  const state = typeof record.state === "string" ? record.state.trim().toUpperCase() : "";
  const suburbRaw = typeof record.suburb === "string"
    ? record.suburb
    : typeof record.city === "string"
      ? record.city
      : "";
  const suburb = titleCase(suburbRaw);
  const isNsw = state === "" || state === "NSW" || state === "NEW SOUTH WALES";
  if (!isNsw || !suburb) return "NSW";
  return `${suburb}, NSW`;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
 * ~1 newsletter, ~3 stock-notify, and ~6 site-viewer snapshots (count 5–15).
 * Empty product pools skip that draw instead of inventing a product.
 */
export async function generateMinuteSocialProofFeed(now = Date.now()): Promise<SocialProofGenerateResult> {
  const deletedExpired = await cleanupExpiredSocialProof(now);
  const inStockProducts = await loadInStockProducts();
  const outOfStockProducts = await loadOutOfStockProducts();
  const db = getDb();
  const written: EventType[] = [];

  const shouldWrite = (eventType: EventType) => Math.random() < MINUTE_RATES[eventType];

  if (shouldWrite("order") && inStockProducts.length > 0) {
    const product = pick(inStockProducts);
    const entry = blankGeneratedEntry("order", now);
    entry.firstName = pick(FIRST_NAMES);
    entry.location = pick(NSW_LOCATIONS);
    entry.productName = product.name;
    entry.productSlug = product.slug;
    await db.collection("social_proof").add(entry);
    written.push("order");
  }

  if (shouldWrite("newsletter")) {
    const entry = blankGeneratedEntry("newsletter", now);
    entry.firstName = pick(FIRST_NAMES);
    entry.location = pick(NSW_LOCATIONS);
    await db.collection("social_proof").add(entry);
    written.push("newsletter");
  }

  if (shouldWrite("stock_notify") && outOfStockProducts.length > 0) {
    const product = pick(outOfStockProducts);
    const entry = blankGeneratedEntry("stock_notify", now);
    entry.firstName = pick(FIRST_NAMES);
    entry.location = pick(NSW_LOCATIONS);
    entry.productName = product.name;
    entry.productSlug = product.slug;
    await db.collection("social_proof").add(entry);
    written.push("stock_notify");
  }

  if (shouldWrite("site_viewers")) {
    const entry = blankGeneratedEntry("site_viewers", now);
    entry.viewerCount = randomInt(5, 15);
    await db.collection("social_proof").add(entry);
    written.push("site_viewers");
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
        const addresses = Array.isArray(data.addresses) ? data.addresses : [];
        const address = data.address
          ?? addresses.find((entry) => entry && typeof entry === "object" && (entry as { isDefault?: boolean }).isDefault)
          ?? addresses[0];
        return {
          firstName: firstName !== "Someone" ? firstName : firstNameFromEmail(email),
          location: formatNswSocialProofLocation(address),
        };
      }
    } catch (err) {
      logger.warn("Social proof user lookup failed; falling back to email.", err);
    }
  }

  return {
    firstName: firstNameFromEmail(email),
    location: "NSW",
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

export async function publishLiveSiteViewersSocialProof(
  now = Date.now(),
): Promise<{ written: boolean; viewerCount: number }> {
  const db = getDb();
  const snap = await db.collection("sitePresence").get();
  let viewerCount = 0;
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
      viewerCount += 1;
      continue;
    }

    batch.delete(docSnap.ref);
    pending += 1;
    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();

  if (viewerCount < 1) {
    return { written: false, viewerCount: 0 };
  }

  await db.collection("social_proof").add({
    eventType: "site_viewers",
    firstName: "",
    location: "",
    productName: "",
    productSlug: "",
    viewerCount,
    displayAt: admin.firestore.Timestamp.fromMillis(now),
    source: "site_viewers",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { written: true, viewerCount };
}
