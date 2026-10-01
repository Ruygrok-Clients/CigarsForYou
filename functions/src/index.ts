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
  sendCustomerOrderConfirmationEmail,
  sendTestAdminNotification,
} from "./email";
import {
  cleanupExpiredSocialProof,
  generateDailySocialProofFeed,
  writeOrderSocialProof,
} from "./socialProof";

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
 * FIRESTORE TRIGGER 1: NEW ORDER CREATED
 * 1. Sends admin notification alert under notifications@cigarsforyou.com.au
 * 2. Sends customer order confirmation receipt under orders@cigarsforyou.com.au
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

    // 1. Dispatch Admin Notification Email (From: notifications@cigarsforyou.com.au)
    try {
      const adminResult = await sendNewOrderAdminNotification(orderData);
      logger.info(`Admin notification email dispatch completed for #${orderNumber}:`, adminResult);
    } catch (err) {
      logger.error("Failed to process Resend admin email notification for new order:", err);
    }

    // 2. Dispatch Customer Confirmation Email with Order Details (From: orders@cigarsforyou.com.au)
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
 * Daily synthetic social-proof feed (01:00 Australia/Sydney).
 * Idempotent per Sydney calendar day via social_proof_runs/{YYYY-MM-DD}.
 */
export const generateDailySocialProof = onSchedule(
  {
    schedule: "0 1 * * *",
    timeZone: "Australia/Sydney",
    retryCount: 1,
  },
  async () => {
    const result = await generateDailySocialProofFeed();
    logger.info("Daily social proof generate finished.", result);
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
 * Manual seed / recovery for the daily social-proof feed.
 * Still respects the Sydney-day run lock.
 */
export const runDailySocialProof = onCall(async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerSnap = await db.collection("users").doc(authUid).get();
  const role = callerSnap.data()?.role;
  if (role !== "admin" && role !== "member") {
    throw new HttpsError("permission-denied", "Only admin or staff members can seed social proof");
  }

  return generateDailySocialProofFeed();
});

/**
 * FIRESTORE TRIGGER 2: PRODUCT UPDATED (Out-of-Stock & Replenishment Alert)
 * Triggers when a product's stock is updated.
 * - Sends out-of-stock Resend notification to admin staff under notifications@cigarsforyou.com.au if stock drops to <= 0.
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
 * Sends Resend notification email to admin staff under notifications@cigarsforyou.com.au
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
