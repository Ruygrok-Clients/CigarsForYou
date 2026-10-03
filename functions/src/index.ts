import { setGlobalOptions } from "firebase-functions";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {
  sendNewOrderAdminNotification,
  sendOutOfStockAdminAlert,
  sendStockNotificationAdminAlert,
  sendCustomerOrderConfirmationEmail,
  sendTestAdminNotification,
} from "./email";
import {
  cleanupExpiredSocialProof,
  generateMinuteSocialProofFeed,
  publishLiveSiteViewersSocialProof,
  writeNewsletterSocialProof,
  writeOrderSocialProof,
  writeStockNotifySocialProof,
} from "./socialProof";
import { placeRewardOrderForUser, reevaluateLoyaltyTiers, syncOrderRewards } from "./rewards";

export { createDiditSession, getDiditStatus, claimDiditForUser, completeSignup, diditWebhook } from "./didit";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1", secrets: ["RESEND_API_KEY"] });

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
      paymentMethod: "Pending",
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
 * Awards points when a non-reward order is paid, and claws them back if it is
 * later cancelled or refunded. Reward orders never earn points.
 */
export const syncOrderRewardsOnWrite = onDocumentWritten("orders/{orderId}", async (event) => {
  if (!event.data?.after.exists) return;
  try {
    await syncOrderRewards(event.params.orderId);
  } catch (err) {
    logger.error(`Rewards sync failed for order ${event.params.orderId}:`, err);
    throw err;
  }
});

/**
 * Places a reward redemption as an order. Refuses while payments are paused
 * (set REWARD_ORDERS_ENABLED=true once the payment processor is live).
 */
export const placeRewardOrder = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to redeem rewards.");
  }
  return placeRewardOrderForUser(uid, request.data || {});
});

/**
 * Assigns missing tiers to Bronze (then applies the rolling window), and
 * re-checks Silver, Gold, and recent earners so inactive members can drop.
 */
export const reevaluateLoyaltyTiersDaily = onSchedule("every 24 hours", async () => {
  await reevaluateLoyaltyTiers();
});

/**
 * FIRESTORE TRIGGER 1: NEW ORDER CREATED
 * 1. Sends admin notification alert from noreply@cigarsforyou.com.au
 * 2. Sends customer order confirmation receipt from noreply@cigarsforyou.com.au
 */
export const onOrderCreated = onDocumentCreated(
  { document: "orders/{orderId}", secrets: ["RESEND_API_KEY"] },
  async (event) => {
    const orderData = event.data?.data();
    if (!orderData) {
      logger.warn("Order document snapshot is empty, skipping Resend email dispatch.");
      return;
    }

    const orderNumber = orderData.orderNumber || event.params.orderId;
    logger.info(`New order created in Firestore: #${orderNumber}. Dispatching notification & confirmation emails...`);

    // 1. Dispatch Admin Notification Email (From: noreply@cigarsforyou.com.au)
    try {
      const adminResult = await sendNewOrderAdminNotification(orderData);
      logger.info(`Admin notification email dispatch completed for #${orderNumber}:`, adminResult);
    } catch (err) {
      logger.error("Failed to process Resend admin email notification for new order:", err);
    }

    // 2. Dispatch Customer Confirmation Email with Order Details (From: noreply@cigarsforyou.com.au)
    if (orderData.customerEmail) {
      try {
        const customerResult = await sendCustomerOrderConfirmationEmail(orderData);
        logger.info(`Customer order confirmation email dispatch completed for ${orderData.customerEmail} (#${orderNumber}):`, customerResult);
      } catch (err) {
        logger.error(`Failed to process Resend customer confirmation email to ${orderData.customerEmail}:`, err);
      }
    } else {
      logger.warn(`Order #${orderNumber} is missing customerEmail, skipping customer confirmation email.`);
    }

    try {
      await writeOrderSocialProof(orderData);
      logger.info(`Social proof order entry written for #${orderNumber}.`);
    } catch (err) {
      logger.error(`Failed to write social proof entry for order #${orderNumber}:`, err);
    }
  }
);

/**
 * Generated base social-proof feed. Independent draws each minute so
 * hourly expectations stay ~2 orders / ~1 newsletter / ~3 stock-notify.
 * Viewer counts are live presence on the client, not feed snapshots.
 * Real events still write on top.
 */
export const generateMinuteSocialProof = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Australia/Sydney",
    retryCount: 0,
  },
  async () => {
    const result = await generateMinuteSocialProofFeed();
    logger.info("Minute social proof generate finished.", result);
  }
);

/**
 * Nightly cleanup of social-proof entries outside the 59-minute window.
 */
export const cleanupSocialProof = onSchedule(
  {
    schedule: "0 22 * * *",
    timeZone: "Australia/Sydney",
  },
  async () => {
    const deleted = await cleanupExpiredSocialProof();
    logger.info(`Social proof cleanup deleted ${deleted} expired entries.`);
  }
);

/**
 * Prune stale site-presence sessions. Viewer toasts poll live presence
 * as a single current count (not historical social_proof entries).
 */
export const publishLiveSiteViewers = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Australia/Sydney",
    retryCount: 0,
  },
  async () => {
    const result = await publishLiveSiteViewersSocialProof();
    logger.info("Live site viewers presence cleanup finished.", result);
  }
);

/**
 * Manual one-shot of the minute social-proof injector (admin / member).
 */
export const runMinuteSocialProof = onCall(async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerSnap = await db.collection("users").doc(authUid).get();
  const role = callerSnap.data()?.role;
  if (role !== "admin" && role !== "member") {
    throw new HttpsError("permission-denied", "Only admin or staff members can seed social proof");
  }

  return generateMinuteSocialProofFeed();
});

/**
 * FIRESTORE TRIGGER 2: PRODUCT UPDATED (Out-of-Stock & Replenishment Alert)
 * Triggers when a product's stock is updated.
 * - Sends out-of-stock Resend notification to admin staff from noreply@cigarsforyou.com.au if stock drops to <= 0.
 * - Logs pending notifications if stock is replenished > 0.
 */
export const onProductStockUpdated = onDocumentUpdated(
  { document: "products/{productId}", secrets: ["RESEND_API_KEY"] },
  async (event) => {
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
  }
);

/**
 * FIRESTORE TRIGGER 3: NEW STOCK NOTIFICATION REQUEST CREATED
 * Sends Resend notification email to admin staff from noreply@cigarsforyou.com.au
 * when a customer requests to be notified about an out-of-stock product.
 */
export const onStockNotificationCreated = onDocumentCreated(
  { document: "stockNotifications/{notificationId}", secrets: ["RESEND_API_KEY"] },
  async (event) => {
    const notifData = event.data?.data();
    if (!notifData) return;

    logger.info(`New stock notification request created for ${notifData.productName} by ${notifData.email}. Triggering Resend email alert to admin staff...`);
    try {
      await sendStockNotificationAdminAlert(notifData);
    } catch (err) {
      logger.error("Failed to process Resend stock notification request email:", err);
    }

    try {
      await writeStockNotifySocialProof(notifData);
      logger.info(`Social proof stock_notify entry written for ${notifData.productName}.`);
    } catch (err) {
      logger.error("Failed to write social proof entry for stock notification:", err);
    }
  }
);

/**
 * FIRESTORE TRIGGER: NEW EMAIL SUBSCRIBER
 * Writes a real newsletter social-proof toast when someone joins the launch list.
 */
export const onEmailSubscriberCreated = onDocumentCreated(
  { document: "emailSubscribers/{subscriberId}" },
  async (event) => {
    const subscriberData = event.data?.data();
    if (!subscriberData) return;

    try {
      await writeNewsletterSocialProof(subscriberData);
      logger.info(`Social proof newsletter entry written for subscriber ${event.params.subscriberId}.`);
    } catch (err) {
      logger.error("Failed to write social proof entry for email subscriber:", err);
    }
  }
);

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
 * CALLABLE FUNCTION: Send Test Resend Email
 * Allows administrators to trigger a diagnostic email via Resend directly from the admin dashboard.
 * Supports testing both Admin Notifications and Customer Order Confirmations.
 */
export const sendTestAdminEmail = onCall(
  { secrets: ["RESEND_API_KEY"] },
  async (request) => {
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
    const testType = request.data?.type; // 'customer_sample' or 'admin_test'
    const targetEmails = customEmail ? [customEmail] : undefined;

    logger.info(`Test Resend email requested by ${callerData?.email || authUid} (type: ${testType || "admin_test"})`);

    if (testType === "customer_sample" && customEmail) {
      const sampleOrder = {
        orderNumber: `CFY-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: callerData?.displayName || "Test Customer",
        customerEmail: customEmail,
        customerPhone: "+61 400 123 456",
        items: [
          { name: "Cohiba Behike 52", brand: "Cohiba", price: 295.0, quantity: 1 },
          { name: "Montecristo No. 2", brand: "Montecristo", price: 85.0, quantity: 2 },
        ],
        subtotal: 465.0,
        discountAmount: 25.0,
        couponCode: "WELCOME25",
        shippingFee: 0,
        totalAmount: 440.0,
        paymentMethod: "Pending",
        createdAt: new Date().toISOString(),
        deliveryAddress: {
          street: "100 George Street",
          suburb: "The Rocks",
          state: "NSW",
          postcode: "2000",
          country: "Australia",
        },
      };
      return await sendCustomerOrderConfirmationEmail(sampleOrder);
    }

    const result = await sendTestAdminNotification(targetEmails);
    return result;
  }
);
