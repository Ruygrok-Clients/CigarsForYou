import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

function db() {
  return admin.firestore();
}

function isPaid(order: FirebaseFirestore.DocumentData): boolean {
  return typeof order.paidAt === "string" && order.paidAt.length > 0;
}

function isClosed(order: FirebaseFirestore.DocumentData): boolean {
  return order.status === "Cancelled" || (typeof order.refundedAt === "string" && order.refundedAt.length > 0);
}

/**
 * Increments products.purchaseCount by each line quantity once a non-reward
 * order is paid. Idempotent via purchaseCountsApplied. Counts never decrease.
 */
export async function applyPurchaseCounts(orderId: string): Promise<void> {
  const orderRef = db().collection("orders").doc(orderId);

  const applied = await db().runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return false;

    const order = orderSnap.data() || {};
    if (order.purchaseCountsApplied === true) return false;
    if (order.source === "Reward") return false;
    if (!isPaid(order) || isClosed(order)) return false;

    const totals = new Map<string, number>();
    const items = Array.isArray(order.items) ? order.items : [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const line = raw as { productId?: unknown; quantity?: unknown };
      const productId = typeof line.productId === "string" ? line.productId.trim() : "";
      const quantity = Math.floor(Number(line.quantity) || 0);
      if (!productId || quantity <= 0) continue;
      totals.set(productId, (totals.get(productId) || 0) + quantity);
    }

    const refs = [...totals.keys()].map((id) => db().collection("products").doc(id));
    const snaps = refs.length > 0 ? await tx.getAll(...refs) : [];

    snaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const quantity = totals.get(refs[index].id) || 0;
      if (quantity <= 0) return;
      tx.update(snap.ref, {
        purchaseCount: admin.firestore.FieldValue.increment(quantity),
      });
    });

    tx.update(orderRef, { purchaseCountsApplied: true });
    return true;
  });

  if (applied) {
    logger.info(`Purchase counts applied for order ${orderId}`);
  }
}
