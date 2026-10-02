import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { estimateImmediateDispatchFee } from "./immediateDispatchFee";
import {
  normalizeLoyaltyTier,
  productVisibleForTier,
  reevaluateLoyaltyTiers,
  reevaluateUserLoyalty,
  resolveMinTier,
  resolveProductPointsCost,
  tierLabel,
} from "./loyalty";

export { reevaluateLoyaltyTiers };

function db() {
  return admin.firestore();
}

export function pointsEarnedForSpend(subtotal: number, discountAmount: number): number {
  const net = Math.max(0, Number(subtotal) - Number(discountAmount));
  if (!Number.isFinite(net)) return 0;
  return Math.floor(net);
}

function isPaid(order: FirebaseFirestore.DocumentData): boolean {
  return typeof order.paidAt === "string" && order.paidAt.length > 0;
}

function isRefunded(order: FirebaseFirestore.DocumentData): boolean {
  return order.status === "Cancelled" || (typeof order.refundedAt === "string" && order.refundedAt.length > 0);
}

function rewardOrdersEnabled(): boolean {
  return process.env.REWARD_ORDERS_ENABLED === "true";
}

/**
 * Idempotent earn and clawback for a single order.
 * Reward redemptions never earn points. Shipping is excluded from the earn base.
 */
export async function syncOrderRewards(orderId: string): Promise<void> {
  const orderRef = db().collection("orders").doc(orderId);
  let reevaluateUserId = "";

  await db().runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return;

    const order = orderSnap.data() || {};
    const customerId = typeof order.customerId === "string" ? order.customerId : "";
    const userRef = customerId ? db().collection("users").doc(customerId) : null;
    const userSnap = userRef ? await tx.get(userRef) : null;

    const source = order.source as string | undefined;
    const alreadyEarned = typeof order.pointsEarned === "number";
    const pointsEarned = alreadyEarned ? Number(order.pointsEarned) : 0;
    const clawedBack = order.pointsClawedBack === true;

    const shouldRefundReward = source === "Reward"
      && isRefunded(order)
      && Number(order.pointsSpent) > 0
      && order.pointsRefunded !== true;

    if (source === "Reward") {
      if (shouldRefundReward && userSnap?.exists && userRef) {
        const spent = Number(order.pointsSpent) || 0;
        const current = Number(userSnap.data()?.rewardsPoints || 0);
        tx.update(userRef, { rewardsPoints: current + spent });
        tx.set(db().collection("rewardsLedger").doc(), {
          userId: customerId,
          orderId,
          delta: spent,
          reason: "redeem_refund",
          createdAt: new Date().toISOString(),
        });
        // Stock restoration is chosen per line item in the admin cancel flow.
        tx.update(orderRef, { pointsEarned: 0, pointsRefunded: true });
        return;
      }

      if (order.pointsEarned !== 0) {
        tx.update(orderRef, { pointsEarned: 0 });
      }
      return;
    }

    if (isRefunded(order)) {
      if (alreadyEarned && pointsEarned > 0 && !clawedBack) {
        if (userSnap?.exists && userRef) {
          const current = Number(userSnap.data()?.rewardsPoints || 0);
          tx.update(userRef, { rewardsPoints: current - pointsEarned });
        }
        const ledgerRef = db().collection("rewardsLedger").doc();
        tx.set(ledgerRef, {
          userId: customerId,
          orderId,
          delta: -pointsEarned,
          reason: "clawback",
          createdAt: new Date().toISOString(),
        });
        tx.update(orderRef, { pointsClawedBack: true });
        if (userSnap?.exists) reevaluateUserId = customerId;
      }
      return;
    }

    if (!isPaid(order) || alreadyEarned) return;

    const earned = pointsEarnedForSpend(Number(order.subtotal) || 0, Number(order.discountAmount) || 0);

    if (earned > 0 && userSnap?.exists && userRef) {
      const current = Number(userSnap.data()?.rewardsPoints || 0);
      tx.update(userRef, { rewardsPoints: current + earned });
      const ledgerRef = db().collection("rewardsLedger").doc();
      tx.set(ledgerRef, {
        userId: customerId,
        orderId,
        delta: earned,
        reason: "earn",
        createdAt: new Date().toISOString(),
      });
      reevaluateUserId = customerId;
    }

    tx.update(orderRef, { pointsEarned: earned });
  });

  if (reevaluateUserId) {
    await reevaluateUserLoyalty(reevaluateUserId);
  }
}

interface RedeemItemInput {
  rewardProductId?: string;
  quantity?: number;
}

interface PlaceRewardOrderInput {
  items?: RedeemItemInput[];
  deliveryMethod?: string;
  deliveryAddress?: {
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  customerName?: string;
  customerPhone?: string;
  ageConfirmed?: boolean;
}

export async function placeRewardOrderForUser(
  uid: string,
  input: PlaceRewardOrderInput
): Promise<{ orderId: string; orderNumber: string; pointsSpent: number; shippingFee: number }> {
  if (!rewardOrdersEnabled()) {
    throw new HttpsError(
      "failed-precondition",
      "Online payment is temporarily unavailable. Reward orders cannot be placed right now."
    );
  }

  if (!input.ageConfirmed) {
    throw new HttpsError("failed-precondition", "Age confirmation is required.");
  }

  const deliveryMethod = input.deliveryMethod;
  if (deliveryMethod !== "immediate" && deliveryMethod !== "express") {
    throw new HttpsError("invalid-argument", "Choose Immediate Dispatch or Express Dispatch.");
  }

  const address = input.deliveryAddress;
  if (!address?.street?.trim() || !address.suburb?.trim() || !address.state?.trim() || !address.postcode?.trim()) {
    throw new HttpsError("invalid-argument", "A complete delivery address is required.");
  }

  const customerName = (input.customerName || "").trim();
  if (!customerName) {
    throw new HttpsError("invalid-argument", "Customer name is required.");
  }

  const merged = new Map<string, number>();
  for (const item of input.items || []) {
    const id = (item.rewardProductId || "").trim();
    const quantity = Math.floor(Number(item.quantity));
    if (!id || !Number.isFinite(quantity) || quantity <= 0) {
      throw new HttpsError("invalid-argument", "Each reward item needs a product and a quantity.");
    }
    merged.set(id, (merged.get(id) || 0) + quantity);
  }

  if (merged.size === 0) {
    throw new HttpsError("invalid-argument", "Add at least one reward to redeem.");
  }

  let shippingFee = 0;
  if (deliveryMethod === "immediate") {
    const quote = estimateImmediateDispatchFee({
      postcode: address.postcode.trim(),
      state: address.state.trim(),
    });
    if (!quote) {
      throw new HttpsError("failed-precondition", "Immediate Dispatch is not available for this address.");
    }
    shippingFee = quote.feeAud;
  }

  const userRef = db().collection("users").doc(uid);
  const productRefs = [...merged.keys()].map((id) => db().collection("rewardProducts").doc(id));

  const orderRef = db().collection("orders").doc();
  const ledgerRef = db().collection("rewardsLedger").doc();
  const now = new Date().toISOString();
  const orderNumber = `CFY-RWD-${Math.floor(100000 + Math.random() * 900000)}`;

  let pointsSpent = 0;

  await db().runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "Customer profile was not found.");
    }

    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const lineItems: Array<{
      productId: string;
      name: string;
      brand: string;
      price: number;
      quantity: number;
      pointsCost: number;
    }> = [];

    pointsSpent = 0;

    const userData = userSnap.data() || {};
    const tier = normalizeLoyaltyTier(userData.loyaltyTier);

    productSnaps.forEach((snap, index) => {
      const productId = productRefs[index].id;
      const quantity = merged.get(productId) || 0;
      if (!snap.exists) {
        throw new HttpsError("not-found", "A reward product is no longer available.");
      }
      const product = snap.data() || {};
      if (product.active === false) {
        throw new HttpsError("failed-precondition", `${product.name || "A reward"} is not available.`);
      }
      if (!productVisibleForTier(product, tier)) {
        const required = tierLabel(resolveMinTier(product));
        throw new HttpsError(
          "failed-precondition",
          `${product.name || "A reward"} is available to ${required} members and above.`
        );
      }
      const stock = Number(product.stock) || 0;
      if (quantity > stock) {
        throw new HttpsError("failed-precondition", `${product.name || "A reward"} does not have enough stock.`);
      }
      const pointsCost = resolveProductPointsCost(product, tier);
      if (pointsCost <= 0) {
        throw new HttpsError("failed-precondition", `${product.name || "A reward"} does not have a points price.`);
      }

      pointsSpent += pointsCost * quantity;
      lineItems.push({
        productId,
        name: String(product.name || "Reward"),
        brand: "Rewards",
        price: 0,
        quantity,
        pointsCost,
      });
      tx.update(productRefs[index], { stock: stock - quantity });
    });

    const currentPoints = Number(userData.rewardsPoints || 0);
    const spendable = Math.max(0, Math.floor(currentPoints));
    if (pointsSpent > spendable) {
      throw new HttpsError("failed-precondition", "You do not have enough points for this redemption.");
    }

    tx.update(userRef, { rewardsPoints: currentPoints - pointsSpent });
    tx.set(ledgerRef, {
      userId: uid,
      orderId: orderRef.id,
      delta: -pointsSpent,
      reason: "redeem",
      createdAt: now,
    });
    tx.set(orderRef, {
      orderNumber,
      customerId: uid,
      customerName,
      customerEmail: userSnap.data()?.email || "",
      customerPhone: (input.customerPhone || "").trim(),
      items: lineItems,
      subtotal: 0,
      discountAmount: 0,
      shippingFee,
      deliveryMethod,
      totalAmount: shippingFee,
      currency: "AUD",
      status: "Pending",
      source: "Reward",
      paymentMethod: "Other",
      deliveryAddress: {
        id: "reward-checkout",
        street: address.street!.trim(),
        suburb: address.suburb!.trim(),
        state: address.state!.trim(),
        postcode: address.postcode!.trim(),
        country: (address.country || "Australia").trim() || "Australia",
      },
      ageConfirmed: true,
      createdAt: now,
      paidAt: now,
      pointsEarned: 0,
      pointsClawedBack: false,
      pointsSpent,
      statusHistory: [
        { status: "Pending", timestamp: now, updatedBy: "Rewards Checkout" },
      ],
      archived: false,
    });
  });

  logger.info(`Reward order ${orderNumber} placed for ${uid} (${pointsSpent} pts, shipping ${shippingFee}).`);

  return { orderId: orderRef.id, orderNumber, pointsSpent, shippingFee };
}
