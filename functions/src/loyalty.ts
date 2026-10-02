import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { sendLoyaltyTierEmail } from "./email";

export type LoyaltyTier = "bronze" | "silver" | "gold";

export const LOYALTY_TIERS: LoyaltyTier[] = ["bronze", "silver", "gold"];
export const DEFAULT_SILVER_THRESHOLD = 350;
export const DEFAULT_GOLD_THRESHOLD = 750;
export const LOYALTY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface RewardsThresholds {
  silverThreshold: number;
  goldThreshold: number;
}

export interface TierPointsCost {
  bronze: number;
  silver: number;
  gold: number;
}

function db() {
  return admin.firestore();
}

export function normalizeLoyaltyTier(value: unknown): LoyaltyTier {
  if (value === "bronze" || value === "silver" || value === "gold") return value;
  return "bronze";
}

export function isStoredLoyaltyTier(value: unknown): value is LoyaltyTier {
  return value === "bronze" || value === "silver" || value === "gold";
}

export function tierRank(tier: LoyaltyTier): number {
  return LOYALTY_TIERS.indexOf(normalizeLoyaltyTier(tier));
}

export function tierLabel(tier: LoyaltyTier): string {
  const normalized = normalizeLoyaltyTier(tier);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function suggestedLoyaltyTier(
  windowPoints: number,
  silverThreshold: number,
  goldThreshold: number
): LoyaltyTier {
  const points = Math.max(0, Math.floor(Number(windowPoints) || 0));
  const silver = Math.max(1, Math.floor(Number(silverThreshold) || DEFAULT_SILVER_THRESHOLD));
  const gold = Math.max(silver + 1, Math.floor(Number(goldThreshold) || DEFAULT_GOLD_THRESHOLD));
  if (points >= gold) return "gold";
  if (points >= silver) return "silver";
  return "bronze";
}

/** Jump up any number of tiers. Drop exactly one tier when below the current tier's threshold. */
export function applyLoyaltyTierTransition(current: LoyaltyTier, suggested: LoyaltyTier): LoyaltyTier {
  const currentRank = tierRank(current);
  const suggestedRank = tierRank(suggested);
  if (suggestedRank > currentRank) return suggested;
  if (suggestedRank < currentRank) return LOYALTY_TIERS[currentRank - 1];
  return normalizeLoyaltyTier(current);
}

function positiveCost(value: unknown, fallback: number): number {
  const next = Math.floor(Number(value));
  if (!Number.isFinite(next) || next < 1) return fallback;
  return next;
}

export function resolvePointsCostByTier(product: FirebaseFirestore.DocumentData): TierPointsCost {
  const legacy = positiveCost(product.pointsCost, 1);
  const raw = (product.pointsCostByTier || {}) as Partial<TierPointsCost>;
  const bronze = positiveCost(raw.bronze, legacy);
  const silver = positiveCost(raw.silver, bronze);
  const gold = positiveCost(raw.gold, silver);
  return { bronze, silver, gold };
}

export function resolveMinTier(product: FirebaseFirestore.DocumentData): LoyaltyTier {
  return normalizeLoyaltyTier(product.minTier);
}

export function resolveProductPointsCost(product: FirebaseFirestore.DocumentData, tier: unknown): number {
  return resolvePointsCostByTier(product)[normalizeLoyaltyTier(tier)];
}

export function productVisibleForTier(product: FirebaseFirestore.DocumentData, tier: unknown): boolean {
  return tierRank(resolveMinTier(product)) <= tierRank(normalizeLoyaltyTier(tier));
}

export async function getRewardsSettings(): Promise<RewardsThresholds> {
  const ref = db().collection("settings").doc("rewards");
  const snap = await ref.get();
  if (!snap.exists) {
    const defaults = {
      silverThreshold: DEFAULT_SILVER_THRESHOLD,
      goldThreshold: DEFAULT_GOLD_THRESHOLD,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(defaults);
    return { silverThreshold: DEFAULT_SILVER_THRESHOLD, goldThreshold: DEFAULT_GOLD_THRESHOLD };
  }
  const data = snap.data() || {};
  let silver = Math.floor(Number(data.silverThreshold));
  let gold = Math.floor(Number(data.goldThreshold));
  if (!Number.isFinite(silver) || silver < 1) silver = DEFAULT_SILVER_THRESHOLD;
  if (!Number.isFinite(gold) || gold <= silver) gold = Math.max(silver + 1, DEFAULT_GOLD_THRESHOLD);
  return { silverThreshold: silver, goldThreshold: gold };
}

/** Purchase earns in the last 30 days, with clawed-back orders removed. Redeems do not count. */
export async function rollingEarnPoints(userId: string, nowMs: number = Date.now()): Promise<number> {
  const cutoff = new Date(nowMs - LOYALTY_WINDOW_MS).toISOString();
  const snap = await db().collection("rewardsLedger")
    .where("userId", "==", userId)
    .where("createdAt", ">=", cutoff)
    .get();

  const clawedOrders = new Set<string>();
  snap.docs.forEach((entry) => {
    const data = entry.data();
    if (data.reason === "clawback" && typeof data.orderId === "string" && data.orderId) {
      clawedOrders.add(data.orderId);
    }
  });

  let total = 0;
  snap.docs.forEach((entry) => {
    const data = entry.data();
    if (data.reason !== "earn") return;
    const orderId = typeof data.orderId === "string" ? data.orderId : "";
    if (orderId && clawedOrders.has(orderId)) return;
    const delta = Number(data.delta) || 0;
    if (delta > 0) total += delta;
  });
  return Math.floor(total);
}

/**
 * Recompute one user's tier from the rolling window.
 * A missing tier is treated as Bronze, then the upgrade / drop-one rules are applied.
 */
export async function reevaluateUserLoyalty(userId: string, settings?: RewardsThresholds): Promise<void> {
  if (!userId) return;
  const userRef = db().collection("users").doc(userId);
  const [userSnap, thresholds, windowPoints] = await Promise.all([
    userRef.get(),
    settings ? Promise.resolve(settings) : getRewardsSettings(),
    rollingEarnPoints(userId),
  ]);
  if (!userSnap.exists) return;

  const data = userSnap.data() || {};
  const stored = data.loyaltyTier;
  const current = isStoredLoyaltyTier(stored) ? stored : "bronze";
  const next = applyLoyaltyTierTransition(
    current,
    suggestedLoyaltyTier(windowPoints, thresholds.silverThreshold, thresholds.goldThreshold)
  );

  const shouldEmail = isStoredLoyaltyTier(stored) ? stored !== next : next !== "bronze";

  const patch: Record<string, unknown> = {};
  if (!isStoredLoyaltyTier(stored) || stored !== next) {
    patch.loyaltyTier = next;
    patch.loyaltyTierUpdatedAt = new Date().toISOString();
  }
  if (Number(data.loyaltyWindowPoints) !== windowPoints) {
    patch.loyaltyWindowPoints = windowPoints;
  }
  if (Object.keys(patch).length === 0) return;
  await userRef.update(patch);

  if (!shouldEmail) return;
  try {
    await sendLoyaltyTierEmail({
      to: typeof data.email === "string" ? data.email : "",
      name: typeof data.displayName === "string" ? data.displayName : "",
      previous: current,
      next,
      windowPoints,
      upgraded: tierRank(next) > tierRank(current),
    });
  } catch (err) {
    logger.error(`Loyalty tier email failed for ${userId}:`, err);
  }
}

/**
 * Daily pass:
 * - backfill accounts with a missing or invalid tier (starting from Bronze, then applying the window)
 * - re-check Silver and Gold so inactive members can drop
 * - re-check anyone with earn or clawback activity in the window so upgrades are not stuck
 */
export async function reevaluateLoyaltyTiers(): Promise<void> {
  const settings = await getRewardsSettings();
  const cutoff = new Date(Date.now() - LOYALTY_WINDOW_MS).toISOString();
  const recentSnap = await db().collection("rewardsLedger").where("createdAt", ">=", cutoff).get();
  const recentUsers = new Set<string>();
  recentSnap.docs.forEach((entry) => {
    const data = entry.data();
    const reason = data.reason;
    if (reason !== "earn" && reason !== "clawback") return;
    if (typeof data.userId === "string" && data.userId) recentUsers.add(data.userId);
  });

  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let scanned = 0;
  let checked = 0;

  while (true) {
    let query = db().collection("users").orderBy(admin.firestore.FieldPath.documentId()).limit(200);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;

    for (const userDoc of snap.docs) {
      scanned += 1;
      const stored = userDoc.data().loyaltyTier;
      const valid = isStoredLoyaltyTier(stored);
      const elevated = stored === "silver" || stored === "gold";
      const recent = recentUsers.has(userDoc.id);
      if (valid && !elevated && !recent) continue;
      await reevaluateUserLoyalty(userDoc.id, settings);
      checked += 1;
    }

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 200) break;
  }

  logger.info(`Loyalty tiers reevaluated. Scanned ${scanned} users, checked ${checked}.`);
}
