import { setGlobalOptions } from "firebase-functions";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

import {
  sendNewOrderAdminNotification,
  sendOutOfStockAdminAlert,
  sendStockNotificationAdminAlert,
  sendTestAdminNotification,
} from "./email";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

/**
 * STRIPE WEBHOOK HANDLER (Scaffolded)
 * Listens for Stripe webhook events: invoice.paid, invoice.payment_failed,
 * customer.subscription.updated/deleted, checkout.session.completed.
 */
export const stripeWebhook = onRequest(async (req, res) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "STRIPE_SECRET_KEY_PLACEHOLDER";
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "STRIPE_WEBHOOK_SECRET_PLACEHOLDER";

  logger.info("Stripe webhook received", {
    configuredKeyPresent: !!process.env.STRIPE_SECRET_KEY,
    secretKeyPrefix: stripeSecretKey.substring(0, 7),
    webhookSecretPrefix: stripeWebhookSecret.substring(0, 5)
  });

  const event = req.body;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        logger.info("Stripe Checkout Session completed:", session.id);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        logger.info("Stripe Invoice paid for subscription:", invoice.subscription);
        // Sync subscription status in Firestore
        if (invoice.subscription) {
          const subQuery = await db.collection("subscriptions")
            .where("stripeSubscriptionId", "==", invoice.subscription)
            .get();
          
          subQuery.forEach(async (docSnap) => {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 28); // default increment
            await docSnap.ref.update({
              status: "active",
              nextBillingDate: nextDate.toISOString()
            });
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        logger.warn("Stripe Invoice payment failed:", invoice.subscription);
        if (invoice.subscription) {
          const subQuery = await db.collection("subscriptions")
            .where("stripeSubscriptionId", "==", invoice.subscription)
            .get();
          subQuery.forEach(async (docSnap) => {
            await docSnap.ref.update({ status: "paused" });
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        logger.info("Stripe Subscription cancelled:", subscription.id);
        const subQuery = await db.collection("subscriptions")
          .where("stripeSubscriptionId", "==", subscription.id)
          .get();
        subQuery.forEach(async (docSnap) => {
          await docSnap.ref.update({ status: "cancelled" });
        });
        break;
      }
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error("Error processing Stripe webhook:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

/**
 * PAYPAL WEBHOOK HANDLER (Scaffolded)
 * Handles PayPal order captures & subscription lifecycle events.
 */
export const paypalWebhook = onRequest(async (req, res) => {
  const paypalClientId = process.env.PAYPAL_CLIENT_ID || "PAYPAL_CLIENT_ID_PLACEHOLDER";
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || "PAYPAL_CLIENT_SECRET_PLACEHOLDER";

  logger.info("PayPal webhook received", {
    configuredIdPresent: !!process.env.PAYPAL_CLIENT_ID,
    clientIdPrefix: paypalClientId.substring(0, 6),
    secretPrefix: paypalClientSecret.substring(0, 6)
  });

  const event = req.body;

  try {
    if (event.event_type === "PAYMENT.SALE.COMPLETED") {
      logger.info("PayPal payment sale completed for resource:", event.resource?.id);
    } else if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
      const paypalSubId = event.resource?.id;
      if (paypalSubId) {
        const subQuery = await db.collection("subscriptions")
          .where("paypalSubscriptionId", "==", paypalSubId)
          .get();
        subQuery.forEach(async (docSnap) => {
          await docSnap.ref.update({ status: "cancelled" });
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error("Error processing PayPal webhook:", err);
    res.status(400).send(`PayPal Webhook Error: ${err.message}`);
  }
});

/**
 * RECURRING SUBSCRIPTION BILLING CYCLE CRON
 * Runs daily to check active subscriptions due for billing and generates automated orders.
 */
export const processRecurringSubscriptions = onSchedule("every 24 hours", async (event) => {
  logger.info("Processing daily subscription billing cycles...");

  const nowIso = new Date().toISOString();
  const dueSubs = await db.collection("subscriptions")
    .where("status", "==", "active")
    .where("nextBillingDate", "<=", nowIso)
    .get();

  logger.info(`Found ${dueSubs.size} subscription(s) due for renewal.`);

  for (const subDoc of dueSubs.docs) {
    const subData = subDoc.data();
    const orderNumber = `CFY-SUB-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = {
      orderNumber,
      customerId: subData.customerId,
      customerName: subData.customerName,
      customerEmail: subData.customerEmail,
      items: [
        {
          productId: subData.productId,
          name: subData.productName,
          brand: subData.productBrand,
          price: subData.pricePerDelivery / subData.quantity,
          quantity: subData.quantity,
          isSubscription: true,
          frequencyWeeks: subData.frequencyWeeks
        }
      ],
      subtotal: subData.pricePerDelivery,
      discountAmount: 0,
      totalAmount: subData.pricePerDelivery,
      currency: "AUD",
      status: "Verified",
      source: "Subscription-generated",
      paymentMethod: subData.stripeSubscriptionId ? "Stripe" : "PayPal",
      deliveryAddress: subData.deliveryAddress,
      ageConfirmed: true,
      isSubscriptionOrder: true,
      subscriptionId: subDoc.id,
      createdAt: new Date().toISOString(),
      statusHistory: [
        { status: "Verified", timestamp: new Date().toISOString(), updatedBy: "Subscription Auto-Billing" }
      ],
      archived: false
    };

    await db.collection("orders").add(newOrder);

    // Calculate next billing date based on frequencyWeeks
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + (subData.frequencyWeeks * 7));

    await subDoc.ref.update({
      nextBillingDate: nextBillingDate.toISOString()
    });

    logger.info(`Created subscription order ${orderNumber} for ${subData.customerEmail}`);
  }
});

/**
 * FIRESTORE TRIGGER 1: NEW ORDER CREATED
 * Sends Resend notification email to all admin staff when a new order document is created.
 */
export const onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const orderData = event.data?.data();
  if (!orderData) {
    logger.warn("Order document snapshot is empty, skipping Resend email dispatch.");
    return;
  }

  logger.info(`New order created in Firestore: #${orderData.orderNumber || event.params.orderId}. Sending Resend email to admin staff...`);
  try {
    await sendNewOrderAdminNotification(orderData);
  } catch (err) {
    logger.error("Failed to process Resend email notification for new order:", err);
  }
});

/**
 * FIRESTORE TRIGGER 2: PRODUCT UPDATED (Out-of-Stock & Replenishment Alert)
 * Triggers when a product's stock is updated.
 * - Sends out-of-stock Resend notification to all admin staff if stock drops to <= 0.
 * - Logs pending notifications if stock is replenished > 0.
 */
export const onProductStockUpdated = onDocumentUpdated("products/{productId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;

  const productId = event.params.productId;

  // Case A: Product went OUT OF STOCK (stock was > 0, now <= 0)
  if (beforeData.stock > 0 && afterData.stock <= 0) {
    logger.info(`Product ${afterData.name} (${productId}) went out of stock. Triggering Resend email alert to admin staff...`);
    try {
      await sendOutOfStockAdminAlert(afterData, productId);
    } catch (err) {
      logger.error("Failed to process Resend out-of-stock email alert:", err);
    }
  }

  // Case B: Product stock was REPLENISHED (stock was <= 0, now > 0)
  if (beforeData.stock <= 0 && afterData.stock > 0) {
    logger.info(`Product ${afterData.name} stock replenished to ${afterData.stock}. Checking customer stock notifications...`);
    try {
      const notifs = await db.collection("stockNotifications")
        .where("productId", "==", productId)
        .where("notified", "==", false)
        .get();

      logger.info(`Found ${notifs.size} pending stock notification request(s) for ${afterData.name}.`);
    } catch (err) {
      logger.error("Failed to query stock notifications upon replenishment:", err);
    }
  }
});

/**
 * FIRESTORE TRIGGER 3: NEW STOCK NOTIFICATION REQUEST CREATED
 * Sends Resend notification email to all admin staff when a customer requests to be notified about an out-of-stock product.
 */
export const onStockNotificationCreated = onDocumentCreated("stockNotifications/{notificationId}", async (event) => {
  const notifData = event.data?.data();
  if (!notifData) return;

  logger.info(`New stock notification request created for ${notifData.productName} by ${notifData.email}. Triggering Resend email alert to admin staff...`);
  try {
    await sendStockNotificationAdminAlert(notifData);
  } catch (err) {
    logger.error("Failed to process Resend stock notification request email:", err);
  }
});

/**
 * CALLABLE FUNCTION: Set User Role Claim
 */
export const setUserRole = onCall(async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { targetUid, role } = request.data;
  if (!["admin", "member", "customer"].includes(role)) {
    throw new HttpsError("invalid-argument", "Invalid role specified");
  }

  // Update Firestore user profile role
  await db.collection("users").doc(targetUid).update({ role });
  await admin.auth().setCustomUserClaims(targetUid, { role });

  return { success: true, targetUid, role };
});

/**
 * CALLABLE FUNCTION: Send Test Resend Admin Email
 * Allows administrators to trigger a diagnostic email via Resend directly from the admin dashboard.
 */
export const sendTestAdminEmail = onCall(async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated to send test emails");
  }

  const callerSnap = await db.collection("users").doc(authUid).get();
  const callerData = callerSnap.data();
  const role = callerData?.role;

  if (role !== "admin" && role !== "member") {
    throw new HttpsError("permission-denied", "Only admin or staff members can trigger test emails");
  }

  const customEmail = request.data?.email;
  const targetEmails = customEmail ? [customEmail] : undefined;

  logger.info(`Test Resend admin email requested by ${callerData?.email || authUid}`);
  const result = await sendTestAdminNotification(targetEmails);

  return result;
});
