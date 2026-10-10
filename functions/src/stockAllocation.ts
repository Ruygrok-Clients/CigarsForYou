import * as admin from "firebase-admin";
import { randomBytes } from "crypto";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
  EXPRESS_DELIVERY_FEE,
  estimateImmediateDispatchFeeFromAddress,
  normalizeDeliveryAddress,
} from "./immediateDispatchFee";
import { getDistributionHub } from "./distributionHubs";
import { sendStockAllocationApologyEmail } from "./email";

const CONFLICT_WINDOW_MS = 60 * 60 * 1000;
const APOLOGY_AMOUNT = 25;

export type StockAllocationStatus = "pending" | "allocated" | "conflict" | "resolved";
export type StockConflictResolution = "full_cancel" | "customer_partial" | "default_shortfall";

export interface StockShortfall {
  productId: string;
  name: string;
  requested: number;
  allocated: number;
  shortfall: number;
}

interface OrderLine {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  allocatedQuantity?: number;
  cancelledQuantity?: number;
  stockRestored?: boolean;
  listUnitPrice?: number;
  unitPriceMultiplier?: number;
}

function db() {
  return admin.firestore();
}

function round2(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function paymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "true";
}

async function isStaff(uid: string): Promise<boolean> {
  const snap = await db().collection("users").doc(uid).get();
  const role = snap.data()?.role;
  return role === "admin" || role === "member";
}

function lineShortfall(line: OrderLine): number {
  const requested = Math.max(0, Math.floor(Number(line.quantity) || 0));
  const allocated = Math.max(0, Math.floor(Number(line.allocatedQuantity) || 0));
  return Math.max(0, requested - allocated);
}

function chargedUnitPrice(product: FirebaseFirestore.DocumentData, quantity: number): { unit: number; multiplier: number } {
  const list = round2(Number(product.price) || 0);
  const category = product.category;
  const tobacco = !category || category === "cigars" || category === "cigarettes";
  if (!tobacco) return { unit: list, multiplier: 1 };
  const stored = Array.isArray(product.bulkDiscountTiers) ? product.bulkDiscountTiers : [];
  const tiers = (stored.length > 0 ? stored : [
    { minQuantity: 1, unitPriceMultiplier: 1 },
    { minQuantity: 10, unitPriceMultiplier: 0.95 },
    { minQuantity: 25, unitPriceMultiplier: 0.93 },
  ]).slice().sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity));
  let match = tiers[0];
  for (const tier of tiers) {
    if (quantity >= Number(tier.minQuantity)) match = tier;
  }
  const multiplier = Number(match?.unitPriceMultiplier);
  const factor = Number.isFinite(multiplier) ? multiplier : 1;
  return { unit: round2(list * factor), multiplier: factor };
}

function makeToken(): string {
  return randomBytes(18).toString("hex");
}

function makeApologyCode(): string {
  return `SORRY25-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export interface CouponRedeemResult {
  code: string;
  discountType: "percentage" | "fixed" | "free_shipping";
  amount: number;
}

function couponFromSnap(code: string, snap: FirebaseFirestore.DocumentSnapshot): CouponRedeemResult {
  if (!snap.exists) {
    throw new HttpsError("not-found", `Coupon ${code} was not found.`);
  }
  const data = snap.data() || {};
  if (data.active === false) {
    throw new HttpsError("failed-precondition", `Coupon ${code} is not active.`);
  }
  if (typeof data.expiresAt === "string" && data.expiresAt && Date.parse(data.expiresAt) < Date.now()) {
    throw new HttpsError("failed-precondition", `Coupon ${code} has expired.`);
  }
  const limit = Number(data.usageLimit);
  const used = Number(data.usedCount || 0);
  if (Number.isFinite(limit) && limit > 0 && used >= limit) {
    throw new HttpsError("failed-precondition", `Coupon ${code} has already been used.`);
  }
  const discountType = data.discountType;
  if (discountType !== "percentage" && discountType !== "fixed" && discountType !== "free_shipping") {
    throw new HttpsError("failed-precondition", `Coupon ${code} cannot be applied.`);
  }
  return { code, discountType, amount: Number(data.amount) || 0 };
}

/** Read every code before any write, then increment usage. Future paid checkout should use this. */
export async function redeemCouponInTransaction(
  tx: FirebaseFirestore.Transaction,
  codes: string[],
): Promise<CouponRedeemResult[]> {
  const cleanCodes = [...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
  const refs = cleanCodes.map((code) => db().collection("coupons").doc(code));
  const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
  const redeemed = snaps.map((snap, index) => couponFromSnap(cleanCodes[index], snap));
  refs.forEach((ref) => {
    tx.update(ref, {
      usedCount: admin.firestore.FieldValue.increment(1),
      timesClaimed: admin.firestore.FieldValue.increment(1),
    });
  });
  return redeemed;
}

function publicIssue(orderId: string, order: FirebaseFirestore.DocumentData) {
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    orderId,
    orderNumber: String(order.orderNumber || ""),
    customerName: String(order.customerName || ""),
    stockAllocationStatus: (order.stockAllocationStatus || null) as StockAllocationStatus | null,
    stockShortfalls: Array.isArray(order.stockShortfalls) ? order.stockShortfalls : [],
    stockConflictDecisionDeadline: order.stockConflictDecisionDeadline || null,
    stockConflictResolution: order.stockConflictResolution || null,
    apologyCouponCode: order.apologyCouponCode || null,
    items: items.map((item: OrderLine, lineIndex: number) => ({
      lineIndex,
      productId: item.productId,
      name: item.name,
      brand: item.brand,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
      allocatedQuantity: Number(item.allocatedQuantity) || 0,
      cancelledQuantity: Number(item.cancelledQuantity) || 0,
    })),
    subtotal: Number(order.subtotal) || 0,
    discountAmount: Number(order.discountAmount) || 0,
    shippingFee: Number(order.shippingFee) || 0,
    totalAmount: Number(order.totalAmount) || 0,
    refundAmount: Number(order.refundAmount) || 0,
    status: order.status || null,
  };
}

async function assertCanAccessOrder(
  uid: string | undefined,
  token: unknown,
  order: FirebaseFirestore.DocumentData,
): Promise<void> {
  const expected = typeof order.stockConflictToken === "string" ? order.stockConflictToken : "";
  if (typeof token === "string" && expected && token.length >= 16 && token === expected) return;
  if (uid && order.customerId && order.customerId === uid) return;
  if (uid && await isStaff(uid)) return;
  throw new HttpsError("permission-denied", "You cannot view this order.");
}

async function sendApologyIfPending(orderId: string): Promise<void> {
  const ref = db().collection("orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const order = snap.data() || {};
  if (order.apologyEmailPending !== true) return;
  const code = typeof order.apologyCouponCode === "string" ? order.apologyCouponCode : "";
  if (!code) return;
  try {
    await sendStockAllocationApologyEmail({
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
    }, code);
    await ref.update({
      apologyEmailPending: false,
      apologyEmailSentAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`Apology email failed for order ${orderId}`, err);
  }
}

export async function allocateOrderStockForOrder(orderId: string): Promise<{
  stockAllocationStatus: StockAllocationStatus;
  stockConflictToken: string | null;
  apologyCouponCode: string | null;
  orderNumber: string;
}> {
  const orderRef = db().collection("orders").doc(orderId);
  const result = await db().runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order was not found.");
    }
    const order = orderSnap.data() || {};
    if (order.source === "Reward") {
      throw new HttpsError("failed-precondition", "Reward orders allocate stock when they are placed.");
    }
    const current = order.stockAllocationStatus as StockAllocationStatus | undefined;
    if (current === "allocated" || current === "conflict" || current === "resolved") {
      return {
        stockAllocationStatus: current,
        stockConflictToken: typeof order.stockConflictToken === "string" ? order.stockConflictToken : null,
        apologyCouponCode: typeof order.apologyCouponCode === "string" ? order.apologyCouponCode : null,
        orderNumber: String(order.orderNumber || ""),
      };
    }
    if (current !== "pending") {
      throw new HttpsError("failed-precondition", "Order is not awaiting stock allocation.");
    }

    const items: OrderLine[] = Array.isArray(order.items) ? order.items.map((item: OrderLine) => ({ ...item })) : [];
    if (items.length === 0) {
      throw new HttpsError("failed-precondition", "Order has no items to allocate.");
    }

    const uniqueIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
    const productRefs = uniqueIds.map((id) => db().collection("products").doc(id));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const stockLeft = new Map<string, number>();
    const productExists = new Map<string, boolean>();
    productSnaps.forEach((snap, index) => {
      const id = uniqueIds[index];
      productExists.set(id, snap.exists);
      stockLeft.set(id, snap.exists ? Math.max(0, Math.floor(Number(snap.data()?.stock) || 0)) : 0);
    });

    const shortfalls: StockShortfall[] = [];
    const now = new Date().toISOString();
    items.forEach((line) => {
      const requested = Math.max(0, Math.floor(Number(line.quantity) || 0));
      const available = stockLeft.get(line.productId) ?? 0;
      const take = Math.min(requested, available);
      stockLeft.set(line.productId, available - take);
      line.allocatedQuantity = take;
      if (take < requested) {
        shortfalls.push({
          productId: line.productId,
          name: line.name || "Item",
          requested,
          allocated: take,
          shortfall: requested - take,
        });
      }
    });
    productRefs.forEach((ref, index) => {
      const id = uniqueIds[index];
      if (!productExists.get(id)) return;
      const original = productSnaps[index].exists
        ? Math.max(0, Math.floor(Number(productSnaps[index].data()?.stock) || 0))
        : 0;
      const left = stockLeft.get(id) ?? original;
      if (left !== original) tx.update(ref, { stock: left });
    });

    const token = typeof order.stockConflictToken === "string" && order.stockConflictToken
      ? order.stockConflictToken
      : makeToken();

    if (shortfalls.length === 0) {
      tx.update(orderRef, {
        items,
        stockAllocationStatus: "allocated",
        stockShortfalls: [],
        stockConflictToken: token,
        fulfilmentPaused: false,
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: order.status || "Order Placed",
          timestamp: now,
          updatedBy: "Stock allocation",
          note: "Stock allocated for this order.",
        }),
      });
      return {
        stockAllocationStatus: "allocated" as const,
        stockConflictToken: token,
        apologyCouponCode: null,
        orderNumber: String(order.orderNumber || ""),
      };
    }

    const couponCode = typeof order.apologyCouponCode === "string" && order.apologyCouponCode
      ? order.apologyCouponCode
      : makeApologyCode();
    if (!order.apologyCouponCode) {
      tx.set(db().collection("coupons").doc(couponCode), {
        code: couponCode,
        discountType: "fixed",
        amount: APOLOGY_AMOUNT,
        active: true,
        timesClaimed: 0,
        usedCount: 0,
        minSpend: 0,
        usageLimit: 1,
        createdAt: now,
        source: "stock_allocation_apology",
        orderId,
      });
    }

    const deadline = new Date(Date.now() + CONFLICT_WINDOW_MS).toISOString();
    tx.update(orderRef, {
      items,
      stockAllocationStatus: "conflict",
      stockShortfalls: shortfalls,
      stockConflictDetectedAt: order.stockConflictDetectedAt || now,
      stockConflictDecisionDeadline: order.stockConflictDecisionDeadline || deadline,
      stockConflictToken: token,
      apologyCouponCode: couponCode,
      fulfilmentPaused: true,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: order.status || "Order Placed",
        timestamp: now,
        updatedBy: "Stock allocation",
        note: "Stock allocation problem. Fulfilment is paused until the customer decides.",
      }),
    });

    return {
      stockAllocationStatus: "conflict" as const,
      stockConflictToken: token,
      apologyCouponCode: couponCode,
      orderNumber: String(order.orderNumber || ""),
    };
  });

  return result;
}

interface CancelRequest {
  lineIndex: number;
  productId: string;
  quantity: number;
}

function parseCancellations(value: unknown): CancelRequest[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({
    lineIndex: Math.floor(Number(entry?.lineIndex)),
    productId: asTrimmed(entry?.productId),
    quantity: Math.floor(Number(entry?.quantity)),
  }));
}

export async function resolveStockConflictForOrder(input: {
  orderId: string;
  mode: "full_cancel" | "partial" | "default_shortfall";
  cancellations?: unknown;
  actor: string;
}): Promise<ReturnType<typeof publicIssue>> {
  const orderRef = db().collection("orders").doc(input.orderId);
  const cancellations = parseCancellations(input.cancellations);

  await db().runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order was not found.");
    }
    const order = orderSnap.data() || {};
    if (order.stockAllocationStatus === "resolved") return;
    if (order.stockAllocationStatus !== "conflict") {
      throw new HttpsError("failed-precondition", "This order does not have a stock allocation problem to resolve.");
    }

    const items: OrderLine[] = (Array.isArray(order.items) ? order.items : []).map((item: OrderLine) => ({ ...item }));
    const now = new Date().toISOString();
    const restores = new Map<string, number>();

    const cancelQtyForLine = (line: OrderLine, index: number): number => {
      const requested = Math.max(0, Math.floor(Number(line.quantity) || 0));
      const shortfall = lineShortfall(line);
      if (input.mode === "full_cancel") return requested;
      if (input.mode === "default_shortfall") return shortfall;
      const match = cancellations.find((entry) => entry.lineIndex === index);
      const qty = match ? match.quantity : shortfall;
      if (!match && shortfall === 0) return 0;
      if (match && match.productId && match.productId !== line.productId) {
        throw new HttpsError("invalid-argument", "A cancellation does not match the order line.");
      }
      if (!Number.isFinite(qty) || qty < shortfall || qty > requested) {
        throw new HttpsError("invalid-argument", "Choose a refund quantity that covers every item we could not allocate.");
      }
      return qty;
    };

    let remainingUnits = 0;
    items.forEach((line, index) => {
      const requested = Math.max(0, Math.floor(Number(line.quantity) || 0));
      const allocated = Math.max(0, Math.floor(Number(line.allocatedQuantity) || 0));
      const shortfall = Math.max(0, requested - allocated);
      const cancelQty = input.mode === "full_cancel" ? requested : cancelQtyForLine(line, index);
      const restore = input.mode === "full_cancel"
        ? allocated
        : Math.max(0, cancelQty - shortfall);
      if (restore > 0 && line.productId) {
        restores.set(line.productId, (restores.get(line.productId) || 0) + restore);
      }
      const nextQty = requested - cancelQty;
      remainingUnits += nextQty;
      if (input.mode === "full_cancel") {
        if (allocated > 0) line.stockRestored = true;
      } else {
        line.cancelledQuantity = (Number(line.cancelledQuantity) || 0) + cancelQty;
        line.quantity = nextQty;
        line.allocatedQuantity = allocated - restore;
        if ((line.allocatedQuantity || 0) <= 0 && allocated > 0 && restore >= allocated) {
          line.stockRestored = true;
        }
      }
    });

    const productRefs = [...restores.keys()].map((id) => db().collection("products").doc(id));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    productSnaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const productId = productRefs[index].id;
      const giveBack = restores.get(productId) || 0;
      if (giveBack <= 0) return;
      const stock = Math.max(0, Math.floor(Number(snap.data()?.stock) || 0));
      tx.update(productRefs[index], { stock: stock + giveBack });
    });

    const empty = remainingUnits <= 0 || input.mode === "full_cancel";
    const resolution: StockConflictResolution = input.mode === "full_cancel"
      ? "full_cancel"
      : input.mode === "default_shortfall"
        ? "default_shortfall"
        : "customer_partial";

    const oldSubtotal = Number(order.subtotal) || 0;

    const patch: Record<string, unknown> = {
      items,
      stockAllocationStatus: "resolved",
      stockConflictResolution: resolution,
      stockConflictResolvedAt: now,
      fulfilmentPaused: false,
      refundMethod: "manual",
      apologyEmailPending: order.apologyEmailSentAt ? false : true,
    };

    if (empty) {
      const refundAmount = round2(Number(order.totalAmount) || 0);
      patch.status = "Cancelled";
      patch.refundedAt = now;
      patch.refundAmount = refundAmount;
      patch.statusHistory = admin.firestore.FieldValue.arrayUnion({
        status: "Cancelled",
        timestamp: now,
        updatedBy: input.actor,
        note: "Order cancelled after a stock allocation problem. Refund recorded for the full amount.",
      });
    } else {
      const newSubtotal = round2(items.reduce((sum, line) => sum + (Number(line.price) || 0) * (Number(line.quantity) || 0), 0));
      const oldDiscount = Number(order.discountAmount) || 0;
      const ratio = oldSubtotal > 0 ? newSubtotal / oldSubtotal : 0;
      const newDiscount = Math.min(newSubtotal, round2(oldDiscount * ratio));
      const shipping = Number(order.shippingFee) || 0;
      const newTotal = round2(newSubtotal - newDiscount + shipping);
      const oldTotal = Number(order.totalAmount) || 0;
      patch.subtotal = newSubtotal;
      patch.discountAmount = newDiscount;
      patch.totalAmount = newTotal;
      patch.partialRefundedAt = now;
      patch.refundAmount = round2(Math.max(0, oldTotal - newTotal));
      patch.statusHistory = admin.firestore.FieldValue.arrayUnion({
        status: order.status || "Order Placed",
        timestamp: now,
        updatedBy: input.actor,
        note: "Some items were cancelled after a stock allocation problem. Refund recorded for those items only.",
      });
    }

    if (!order.apologyCouponCode) {
      const couponCode = makeApologyCode();
      tx.set(db().collection("coupons").doc(couponCode), {
        code: couponCode,
        discountType: "fixed",
        amount: APOLOGY_AMOUNT,
        active: true,
        timesClaimed: 0,
        usedCount: 0,
        minSpend: 0,
        usageLimit: 1,
        createdAt: now,
        source: "stock_allocation_apology",
        orderId: input.orderId,
      });
      patch.apologyCouponCode = couponCode;
    }

    tx.update(orderRef, patch);
  });

  await sendApologyIfPending(input.orderId);
  const fresh = await orderRef.get();
  return publicIssue(input.orderId, fresh.data() || {});
}

export async function applyStockConflictDefaults(): Promise<{ resolved: number; emailsRetried: number }> {
  const now = Date.now();
  const snap = await db().collection("orders").where("stockAllocationStatus", "==", "conflict").limit(40).get();
  let resolved = 0;
  for (const docSnap of snap.docs) {
    const deadline = Date.parse(String(docSnap.data().stockConflictDecisionDeadline || ""));
    if (!Number.isFinite(deadline) || deadline > now) continue;
    await resolveStockConflictForOrder({
      orderId: docSnap.id,
      mode: "default_shortfall",
      actor: "Stock allocation default",
    });
    resolved += 1;
  }

  const pendingEmail = await db().collection("orders").where("apologyEmailPending", "==", true).limit(20).get();
  let emailsRetried = 0;
  for (const docSnap of pendingEmail.docs) {
    await sendApologyIfPending(docSnap.id);
    emailsRetried += 1;
  }
  return { resolved, emailsRetried };
}

export async function getOrderStockIssueForCaller(input: {
  orderId: string;
  uid?: string;
  token?: unknown;
}): Promise<ReturnType<typeof publicIssue>> {
  const snap = await db().collection("orders").doc(input.orderId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Order was not found.");
  }
  const order = snap.data() || {};
  await assertCanAccessOrder(input.uid, input.token, order);
  return publicIssue(input.orderId, order);
}

interface PlaceCatalogItem {
  productId?: string;
  quantity?: number;
}

export interface PlaceCatalogOrderInput {
  customerName?: string;
  customerPhone?: string;
  items?: PlaceCatalogItem[];
  deliveryMethod?: string;
  pickupHubId?: string;
  deliveryAddress?: {
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  couponCodes?: string[];
  ageConfirmed?: boolean;
}

/**
 * Paid catalog checkout hook. Storefront stays gated until PAYMENTS_ENABLED=true.
 * Staff may call it before that so the allocation path can be exercised.
 * After a processor confirms payment: create the order here, then send the customer to
 * /order-confirmation when stockAllocationStatus is allocated, or /order-issue when it is conflict.
 */
export async function placeCatalogOrderForUser(
  uid: string,
  input: PlaceCatalogOrderInput,
): Promise<{
  orderId: string;
  orderNumber: string;
  stockAllocationStatus: StockAllocationStatus;
  stockConflictToken: string | null;
  apologyCouponCode: string | null;
}> {
  const staff = await isStaff(uid);
  if (!paymentsEnabled() && !staff) {
    throw new HttpsError("failed-precondition", "Online payment is temporarily unavailable.");
  }

  const deliveryMethod = input.deliveryMethod;
  if (deliveryMethod !== "immediate" && deliveryMethod !== "express" && deliveryMethod !== "pickup") {
    throw new HttpsError("invalid-argument", "Choose Immediate Dispatch, Express Shipping, or In-Store Pickup.");
  }
  if (input.ageConfirmed !== true) {
    throw new HttpsError("failed-precondition", "Age confirmation is required.");
  }

  const userRef = db().collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "Customer profile was not found.");
  }
  const userData = userSnap.data() || {};
  if (userData.ageVerified !== true) {
    throw new HttpsError("failed-precondition", "Age verification is required before checkout.");
  }

  const customerName = asTrimmed(input.customerName) || asTrimmed(userData.displayName);
  if (!customerName) {
    throw new HttpsError("invalid-argument", "Customer name is required.");
  }
  const customerEmail = asTrimmed(userData.email);
  if (!customerEmail.includes("@")) {
    throw new HttpsError("failed-precondition", "A customer email is required.");
  }

  const address = input.deliveryAddress || {};
  const pickupHub = deliveryMethod === "pickup" ? getDistributionHub(asTrimmed(input.pickupHubId)) : undefined;
  if (deliveryMethod === "pickup" && !pickupHub) {
    throw new HttpsError("invalid-argument", "Choose a distribution hub for In-Store Pickup.");
  }
  if (deliveryMethod !== "pickup" && (!asTrimmed(address.street) || !asTrimmed(address.suburb) || !asTrimmed(address.state) || !asTrimmed(address.postcode))) {
    throw new HttpsError("invalid-argument", "A complete delivery address is required.");
  }

  const merged = new Map<string, number>();
  for (const item of input.items || []) {
    const id = asTrimmed(item.productId);
    const quantity = Math.floor(Number(item.quantity));
    if (!id || !Number.isFinite(quantity) || quantity <= 0) {
      throw new HttpsError("invalid-argument", "Each item needs a product and a quantity.");
    }
    merged.set(id, (merged.get(id) || 0) + quantity);
  }
  if (merged.size === 0) {
    throw new HttpsError("invalid-argument", "Add at least one product.");
  }

  let shippingFee = deliveryMethod === "pickup" ? 0 : EXPRESS_DELIVERY_FEE;
  if (deliveryMethod === "immediate") {
    const normalized = normalizeDeliveryAddress(address);
    if (!normalized) {
      throw new HttpsError("failed-precondition", "Immediate Dispatch is not available for this address.");
    }
    const quote = await estimateImmediateDispatchFeeFromAddress(normalized);
    if (!quote) {
      throw new HttpsError("failed-precondition", "Immediate Dispatch is not available for this address.");
    }
    shippingFee = quote.feeAud;
  }

  const orderRef = db().collection("orders").doc();
  const now = new Date().toISOString();
  const orderNumber = `CFY-${Math.floor(100000 + Math.random() * 900000)}`;
  const couponCodes = [...new Set((input.couponCodes || []).map((code) => code.trim().toUpperCase()).filter(Boolean))];

  await db().runTransaction(async (tx) => {
    const productRefs = [...merged.keys()].map((id) => db().collection("products").doc(id));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const redeemed = await redeemCouponInTransaction(tx, couponCodes);

    const lineItems: OrderLine[] = [];
    productSnaps.forEach((snap, index) => {
      const productId = productRefs[index].id;
      const quantity = merged.get(productId) || 0;
      if (!snap.exists) {
        throw new HttpsError("not-found", "A product is no longer available.");
      }
      const product = snap.data() || {};
      if (product.active === false) {
        throw new HttpsError("failed-precondition", `${product.name || "A product"} is not available.`);
      }
      const list = round2(Number(product.price) || 0);
      const priced = chargedUnitPrice(product, quantity);
      lineItems.push({
        productId,
        name: String(product.name || "Cigar"),
        brand: String(product.brand || ""),
        price: priced.unit,
        quantity,
        listUnitPrice: list,
        unitPriceMultiplier: priced.multiplier,
        allocatedQuantity: 0,
      });
    });

    const subtotal = round2(lineItems.reduce((sum, line) => sum + line.price * line.quantity, 0));
    let rawDiscount = 0;
    let waiveImmediate = false;
    for (const coupon of redeemed) {
      if (coupon.discountType === "free_shipping") {
        if (deliveryMethod === "immediate") waiveImmediate = true;
        continue;
      }
      if (coupon.discountType === "percentage") rawDiscount += (subtotal * coupon.amount) / 100;
      if (coupon.discountType === "fixed") rawDiscount += coupon.amount;
    }
    const discountAmount = Math.min(subtotal, round2(rawDiscount));
    const chargedShipping = waiveImmediate ? 0 : shippingFee;
    const totalAmount = round2(subtotal - discountAmount + chargedShipping);

    const deliveryAddress = pickupHub
      ? {
        id: pickupHub.id,
        street: pickupHub.street,
        suburb: pickupHub.suburb,
        state: pickupHub.state,
        postcode: pickupHub.postcode,
        country: pickupHub.country,
      }
      : {
        id: "checkout",
        street: asTrimmed(address.street),
        suburb: asTrimmed(address.suburb),
        state: asTrimmed(address.state),
        postcode: asTrimmed(address.postcode),
        country: asTrimmed(address.country) || "Australia",
      };

    tx.set(orderRef, {
      orderNumber,
      customerId: uid,
      customerName,
      customerEmail,
      customerPhone: asTrimmed(input.customerPhone),
      items: lineItems,
      subtotal,
      discountAmount,
      shippingFee: chargedShipping,
      deliveryMethod,
      ...(pickupHub ? { pickupHubId: pickupHub.id } : {}),
      ...(redeemed[0] ? { couponCode: redeemed[0].code } : {}),
      appliedCoupons: redeemed.map((coupon) => ({ code: coupon.code, discountType: coupon.discountType })),
      totalAmount,
      currency: "AUD",
      status: "Order Placed",
      source: "Website",
      paymentMethod: "Pending",
      deliveryAddress,
      ageConfirmed: true,
      diditSessionId: typeof userData.diditSessionId === "string" ? userData.diditSessionId : null,
      createdAt: now,
      paidAt: now,
      pointsEarned: 0,
      pointsClawedBack: false,
      pointsSpent: 0,
      pointsRefunded: false,
      stockAllocationStatus: "pending",
      fulfilmentPaused: true,
      statusHistory: [
        { status: "Order Placed", timestamp: now, updatedBy: "Catalog checkout" },
      ],
      archived: false,
    });
  });

  const allocation = await allocateOrderStockForOrder(orderRef.id);
  return {
    orderId: orderRef.id,
    orderNumber,
    ...allocation,
  };
}
