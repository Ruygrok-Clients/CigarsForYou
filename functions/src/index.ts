import { setGlobalOptions } from "firebase-functions";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

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
 * STOCK REPLENISHED TRIGGER STUB
 * Triggers when a product's stock is updated above 0, notifying admin/logged notifications.
 */
export const notifyStockReplenished = onDocumentUpdated("products/{productId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;

  // Check if stock transitioned from <= 0 to > 0
  if (beforeData.stock <= 0 && afterData.stock > 0) {
    logger.info(`Product ${afterData.name} stock replenished to ${afterData.stock}. Checking notifications...`);
    const notifs = await db.collection("stockNotifications")
      .where("productId", "==", event.params.productId)
      .where("notified", "==", false)
      .get();

    logger.info(`Found ${notifs.size} pending notification request(s) for ${afterData.name}.`);
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
