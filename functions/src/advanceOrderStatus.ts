import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { sendOrderCollectableEmail, sendOrderShippedEmail } from "./email";

const COURIER_STEPS = ["Order Placed", "Processing", "Shipped", "Fulfilled"] as const;
const PICKUP_STEPS = ["Order Placed", "Processing", "Collectable", "Fulfilled"] as const;

function stepsFor(method: string | undefined): readonly string[] {
  return method === "pickup" ? PICKUP_STEPS : COURIER_STEPS;
}

async function assertStaff(uid: string): Promise<{ label: string }> {
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const data = snap.data() || {};
  const role = data.role;
  if (role !== "admin" && role !== "member") {
    throw new HttpsError("permission-denied", "Only admin or staff members can update orders.");
  }
  const email = typeof data.email === "string" ? data.email : "";
  const name = typeof data.displayName === "string" ? data.displayName : "";
  return { label: email || name || "Admin Portal" };
}

export const advanceOrderStatus = onCall({ secrets: ["RESEND_API_KEY"] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to update this order.");
  }

  const caller = await assertStaff(uid);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
  if (!orderId) {
    throw new HttpsError("invalid-argument", "Order id is required.");
  }

  const trackingNumber = typeof request.data?.trackingNumber === "string" ? request.data.trackingNumber.trim() : "";
  const trackingCarrier = typeof request.data?.trackingCarrier === "string" ? request.data.trackingCarrier.trim() : "";
  const trackingUrl = typeof request.data?.trackingUrl === "string" ? request.data.trackingUrl.trim() : "";

  const db = admin.firestore();
  const orderRef = db.collection("orders").doc(orderId);
  const now = new Date().toISOString();

  type AdvancedOrder = FirebaseFirestore.DocumentData & {
    id: string;
    status: string;
    statusHistory: unknown[];
    trackingNumber?: string | null;
    trackingCarrier?: string | null;
    trackingUrl?: string | null;
  };

  const updated = await db.runTransaction(async (tx): Promise<AdvancedOrder> => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }
    const order = snap.data() || {};
    const status = typeof order.status === "string" ? order.status : "Order Placed";
    if (status === "Fulfilled" || status === "Cancelled") {
      throw new HttpsError("failed-precondition", "This order can no longer be advanced.");
    }
    if (order.stockAllocationStatus === "conflict" || order.fulfilmentPaused === true) {
      throw new HttpsError("failed-precondition", "Fulfilment is paused until the stock allocation problem is resolved.");
    }

    const method = typeof order.deliveryMethod === "string" ? order.deliveryMethod : "express";
    const steps = stepsFor(method);
    const index = steps.indexOf(status);
    if (index < 0 || index >= steps.length - 1) {
      throw new HttpsError("failed-precondition", "This order cannot move to another status.");
    }
    const nextStatus = steps[index + 1];

    const patch: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "Shipped") {
      if (!trackingNumber || !trackingCarrier) {
        throw new HttpsError("invalid-argument", "Tracking carrier and number are required before marking this order shipped.");
      }
      patch.trackingNumber = trackingNumber;
      patch.trackingCarrier = trackingCarrier;
      if (trackingUrl) patch.trackingUrl = trackingUrl;
    }

    const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    history.push({
      status: nextStatus,
      timestamp: now,
      updatedBy: caller.label,
      ...(nextStatus === "Shipped" ? { note: `${trackingCarrier} ${trackingNumber}` } : {}),
    });
    patch.statusHistory = history;

    tx.update(orderRef, patch);
    return { ...order, ...patch, id: orderId } as AdvancedOrder;
  });

  let emailSent = false;
  if (updated.status === "Shipped") {
    const result = await sendOrderShippedEmail(updated);
    emailSent = result?.success !== false;
  } else if (updated.status === "Collectable") {
    const result = await sendOrderCollectableEmail(updated);
    emailSent = result?.success !== false;
  }

  return {
    success: true,
    emailSent,
    order: {
      id: orderId,
      status: updated.status,
      statusHistory: updated.statusHistory,
      trackingNumber: updated.trackingNumber || null,
      trackingCarrier: updated.trackingCarrier || null,
      trackingUrl: updated.trackingUrl || null,
    },
  };
});
