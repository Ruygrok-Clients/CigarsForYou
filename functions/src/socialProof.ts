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
  skipped: boolean;
  deletedExpired: number;
};

function getDb() {
  return admin.firestore();
}

export function sydneyDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

function pickEventType(): EventType {
  const roll = Math.random();
  if (roll < 0.35) return "site_viewers";
  if (roll < 0.65) return "newsletter";
  if (roll < 0.9) return "stock_notify";
  return "order";
}

function buildGeneratedTimestamps(count: number, now: number): number[] {
  const backfillTarget = Math.min(12, Math.max(4, Math.round(count * 0.06)));
  const backfillCount = Math.min(backfillTarget, count);
  const futureCount = count - backfillCount;
  const stamps: number[] = [];

  const backfillWindow = 50 * 60 * 1000;
  for (let i = 0; i < backfillCount; i += 1) {
    const slot = backfillWindow / backfillCount;
    const base = now - backfillWindow + i * slot;
    const jitter = (Math.random() - 0.5) * slot * 0.65;
    const stamped = base + jitter;
    stamps.push(Math.min(now - 1000, Math.max(now - VISIBLE_MS + 5000, stamped)));
  }

  const futureWindow = 24 * 60 * 60 * 1000;
  const start = now + 45_000;
  for (let i = 0; i < futureCount; i += 1) {
    const slot = futureWindow / Math.max(futureCount, 1);
    const base = start + i * slot;
    const jitter = (Math.random() - 0.5) * slot * 0.65;
    stamps.push(base + jitter);
  }

  return stamps;
}

async function loadInStockProducts(): Promise<CatalogProduct[]> {
  const snap = await getDb().collection("products").get();
  const products: CatalogProduct[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active === false) return;
    const stock = typeof data.stock === "number" ? data.stock : 0;
    if (stock <= 0) return;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) return;
    const slug = typeof data.slug === "string" && data.slug.trim()
      ? data.slug.trim()
      : docSnap.id;
    products.push({ name, slug });
  });
  return products;
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

function takeName(pool: string[]): string {
  if (pool.length === 0) {
    pool.push(...FIRST_NAMES);
  }
  const index = Math.floor(Math.random() * pool.length);
  const [name] = pool.splice(index, 1);
  return name ?? "Alex";
}

export async function generateDailySocialProofFeed(now = Date.now()): Promise<SocialProofGenerateResult> {
  const deletedExpired = await cleanupExpiredSocialProof(now);
  const db = getDb();
  const runId = sydneyDateKey(new Date(now));
  const runRef = db.collection("social_proof_runs").doc(runId);
  const existing = await runRef.get();
  if (existing.exists) {
    logger.info(`Social proof run ${runId} already exists; skipping generate.`);
    return { created: 0, skipped: true, deletedExpired };
  }

  const products = await loadInStockProducts();
  const count = randomInt(60, 100);
  const timestamps = buildGeneratedTimestamps(count, now);
  const namePool = [...FIRST_NAMES];
  const createdAt = admin.firestore.Timestamp.fromMillis(now);

  let batch = db.batch();
  let pending = 0;
  let created = 0;

  for (const displayAtMs of timestamps) {
    let eventType = pickEventType();
    const needsProduct = eventType === "order" || eventType === "stock_notify";
    if (needsProduct && products.length === 0) {
      eventType = Math.random() < 0.5 ? "site_viewers" : "newsletter";
    }

    const entry: Record<string, unknown> = {
      eventType,
      firstName: "",
      location: "",
      productName: "",
      productSlug: "",
      displayAt: admin.firestore.Timestamp.fromMillis(Math.round(displayAtMs)),
      source: "generated",
      runId,
      createdAt,
    };

    if (eventType === "site_viewers") {
      entry.viewerCount = randomInt(12, 48);
    } else {
      entry.firstName = takeName(namePool);
      entry.location = pick(NSW_LOCATIONS);
      if (eventType === "order" || eventType === "stock_notify") {
        const product = pick(products);
        entry.productName = product.name;
        entry.productSlug = product.slug;
      }
    }

    batch.set(db.collection("social_proof").doc(), entry);
    pending += 1;
    created += 1;
    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();

  await runRef.set({
    created,
    skipped: false,
    deletedExpired,
    createdAt,
  });

  logger.info(`Generated ${created} social proof entries for ${runId}.`);
  return { created, skipped: false, deletedExpired };
}

export async function writeOrderSocialProof(orderData: admin.firestore.DocumentData): Promise<void> {
  const db = getDb();
  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const first = items[0] && typeof items[0] === "object"
    ? items[0] as Record<string, unknown>
    : undefined;

  let productName = typeof first?.name === "string" && first.name.trim()
    ? first.name.trim()
    : "a cigar";
  let productSlug = "";
  const productId = typeof first?.productId === "string" ? first.productId : "";

  if (productId) {
    try {
      const productSnap = await db.collection("products").doc(productId).get();
      if (productSnap.exists) {
        const product = productSnap.data() ?? {};
        if (typeof product.name === "string" && product.name.trim()) {
          productName = product.name.trim();
        }
        if (typeof product.slug === "string" && product.slug.trim()) {
          productSlug = product.slug.trim();
        }
      }
    } catch (err) {
      logger.warn("Social proof product lookup failed; writing order entry without slug.", err);
    }
  }

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
