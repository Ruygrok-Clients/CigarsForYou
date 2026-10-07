import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { sendImmediateDispatchUnavailableEmail } from "./email";

type RemediationAction = "mark_unavailable" | "full_refund" | "express_upgrade";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function assertStaff(uid: string): Promise<{ email?: string; displayName?: string }> {
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const data = snap.data() || {};
  const role = data.role;
  if (role !== "admin" && role !== "member") {
    throw new HttpsError("permission-denied", "Only admin or staff members can update Immediate Dispatch.");
  }
  return {
    email: typeof data.email === "string" ? data.email : undefined,
    displayName: typeof data.displayName === "string" ? data.displayName : undefined,
  };
}

/**
 * Staff remediation for Immediate Dispatch orders that Didi cannot fulfil.
 * Customer choice is informational only; staff record the outcome here.
 * A complimentary Express upgrade refunds the Immediate fee in bookkeeping
 * and does not set refundedAt, so loyalty points are not clawed back.
 */
export const resolveImmediateDispatch = onCall({ secrets: ["RESEND_API_KEY"] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to update this order.");
  }

  const caller = await assertStaff(uid);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
  const action = request.data?.action as RemediationAction;
  const restoreStockIndexes = Array.isArray(request.data?.restoreStockIndexes)
    ? request.data.restoreStockIndexes.filter((value: unknown) => Number.isInteger(value)).map(Number)
    : [];

  if (!orderId) {
    throw new HttpsError("invalid-argument", "Order id is required.");
  }
  if (action !== "mark_unavailable" && action !== "full_refund" && action !== "express_upgrade") {
    throw new HttpsError("invalid-argument", "Unknown Immediate Dispatch action.");
  }

  const db = admin.firestore();
  const orderRef = db.collection("orders").doc(orderId);
  const updatedBy = caller.email || caller.displayName || "Admin Portal";
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }

    const order = snap.data() || {};
    if (order.deliveryMethod !== "immediate") {
      throw new HttpsError("failed-precondition", "This order is not an Immediate Dispatch order.");
    }
    if (order.status === "Cancelled" || order.status === "Fulfilled") {
      throw new HttpsError("failed-precondition", "This order can no longer be changed.");
    }

    const resolution = order.immediateDispatchResolution as string | undefined;
    const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
    const status = typeof order.status === "string" ? order.status : "Order Placed";

    if (action === "mark_unavailable") {
      if (resolution === "full_refund" || resolution === "express_upgrade") {
        throw new HttpsError("failed-precondition", "This Immediate Dispatch issue is already resolved.");
      }

      const alreadyPending = resolution === "pending_customer";
      if (!alreadyPending) {
        history.push({
          status,
          timestamp: now,
          updatedBy,
          note: "Immediate Dispatch unavailable. Customer emailed with refund or complimentary Express options.",
        });
      }

      const patch: Record<string, unknown> = {
        immediateDispatchResolution: "pending_customer",
        statusHistory: history,
      };
      if (!order.immediateDispatchUnavailableAt) {
        patch.immediateDispatchUnavailableAt = now;
      }
      tx.update(orderRef, patch);

      return {
        emailOrder: { ...order, ...patch },
        resendOnly: alreadyPending,
        order: {
          ...order,
          id: orderId,
          immediateDispatchResolution: "pending_customer",
          immediateDispatchUnavailableAt: order.immediateDispatchUnavailableAt || now,
          statusHistory: history,
        },
      };
    }

    if (resolution !== "pending_customer") {
      throw new HttpsError(
        "failed-precondition",
        "Mark Immediate Dispatch unavailable and notify the customer before recording a choice."
      );
    }

    if (action === "full_refund") {
      const items = Array.isArray(order.items) ? order.items.map((item: Record<string, unknown>, idx: number) => ({
        ...item,
        stockRestored: item.stockRestored === true || restoreStockIndexes.includes(idx),
      })) : [];
      const refundAmount = roundMoney(Number(order.totalAmount) || 0);
      history.push({
        status: "Cancelled",
        timestamp: now,
        updatedBy,
        note: "Customer chose a full refund, including the Immediate Dispatch fee.",
      });

      const patch = {
        status: "Cancelled",
        statusHistory: history,
        items,
        refundedAt: now,
        refundMethod: "manual",
        refundAmount,
        immediateDispatchResolution: "full_refund",
        immediateDispatchResolutionAt: now,
      };
      tx.update(orderRef, patch);

      return {
        emailOrder: null,
        resendOnly: false,
        stockRestore: items
          .map((item: Record<string, unknown>, idx: number) => ({ item, idx }))
          .filter(({ item, idx }: { item: Record<string, unknown>; idx: number }) => (
            restoreStockIndexes.includes(idx) && order.items?.[idx]?.stockRestored !== true && item.productId
          ))
          .map(({ item }: { item: Record<string, unknown> }) => ({
            productId: String(item.productId),
            quantity: Number(item.quantity) || 0,
            source: order.source,
          })),
        order: { ...order, id: orderId, ...patch },
      };
    }

    const shippingFee = roundMoney(Number(order.shippingFee) || 0);
    const nextTotal = roundMoney(Math.max(0, (Number(order.totalAmount) || 0) - shippingFee));
    history.push({
      status,
      timestamp: now,
      updatedBy,
      note: "Customer chose complimentary Express. Immediate Dispatch fee refunded; Express shipping is $0.",
    });

    const patch = {
      deliveryMethod: "express",
      shippingFee: 0,
      totalAmount: nextTotal,
      immediateDispatchFeeRefunded: shippingFee,
      immediateDispatchResolution: "express_upgrade",
      immediateDispatchResolutionAt: now,
      statusHistory: history,
    };
    tx.update(orderRef, patch);

    return {
      emailOrder: null,
      resendOnly: false,
      order: { ...order, id: orderId, ...patch },
    };
  });

  if (result.stockRestore && Array.isArray(result.stockRestore)) {
    for (const line of result.stockRestore) {
      if (!line.productId || line.quantity <= 0) continue;
      const stockCollection = line.source === "Reward" ? "rewardProducts" : "products";
      try {
        await db.collection(stockCollection).doc(line.productId).update({
          stock: admin.firestore.FieldValue.increment(line.quantity),
        });
      } catch (err) {
        logger.warn(`Could not restore stock for ${line.productId} on order ${orderId}`, err);
      }
    }
  }

  let emailSent: boolean | undefined;
  if (action === "mark_unavailable" && result.emailOrder) {
    const emailResult = await sendImmediateDispatchUnavailableEmail(result.emailOrder);
    emailSent = emailResult?.success !== false;
    if (!emailSent) {
      logger.error(`Immediate Dispatch unavailable email failed for order ${orderId}`, emailResult);
    }
  }

  logger.info(`Immediate Dispatch ${action} recorded for order ${orderId} by ${updatedBy}`);

  return {
    success: true,
    emailSent,
    resendOnly: result.resendOnly === true,
    order: result.order,
  };
});
