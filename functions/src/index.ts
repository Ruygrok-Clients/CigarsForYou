import { setGlobalOptions } from "firebase-functions";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import Stripe from "stripe";

import {
  sendNewOrderAdminNotification,
  sendOutOfStockAdminAlert,
  sendStockNotificationAdminAlert,
  sendTestAdminNotification,
} from "./email";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY || "STRIPE_SECRET_KEY_PLACEHOLDER";
  return new Stripe(secretKey);
}

/**
 * CALLABLE FUNCTION: Create Stripe Checkout Session
 * Generates a hosted Stripe Checkout URL for customer order payment.
 */
export const createStripeCheckoutSession = onCall({ cors: true }, async (request) => {
  const { items, customerEmail, customerName, customerPhone, deliveryAddress, originUrl, subtotal, discountAmount, totalAmount } = request.data || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "Cart is empty or missing items.");
  }
  if (!customerEmail || !customerName || !deliveryAddress) {
    throw new HttpsError("invalid-argument", "Missing required customer details or delivery address.");
  }

  const stripe = getStripeInstance();
  const orderNumber = `CFY-${Math.floor(100000 + Math.random() * 900000)}`;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => ({
    price_data: {
      currency: "aud",
      product_data: {
        name: item.product.name,
        description: item.product.brand ? `Brand: ${item.product.brand}` : undefined,
        images: item.product.image ? [item.product.image] : undefined,
      },
      unit_amount: Math.round(item.product.price * 100), // Amount in cents
    },
    quantity: item.quantity,
  }));

  const customerId = request.auth?.uid || "guest-user";
  const baseUrl = originUrl || "http://localhost:5173";

  // Build metadata for webhook order processing
  const sessionMetadata: Record<string, string> = {
    orderNumber,
    customerId,
    customerName,
    customerEmail,
    customerPhone: customerPhone || "",
    street: deliveryAddress.street || "",
    suburb: deliveryAddress.suburb || "",
    state: deliveryAddress.state || "NSW",
    postcode: deliveryAddress.postcode || "",
    country: deliveryAddress.country || "Australia",
    totalAmount: String(totalAmount || 0),
    subtotal: String(subtotal || 0),
    discountAmount: String(discountAmount || 0),
    itemsJson: JSON.stringify(items.map((i: any) => ({
      productId: i.product.id || i.product.slug,
      name: i.product.name,
      brand: i.product.brand || "",
      price: i.product.price,
      quantity: i.quantity
    })))
  };

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail,
      client_reference_id: orderNumber,
      metadata: sessionMetadata,
      success_url: `${baseUrl}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}&order_number=${orderNumber}`,
      cancel_url: `${baseUrl}/checkout?canceled=true`,
    });

    logger.info(`Created Stripe checkout session ${session.id} for order ${orderNumber}`);
    return { checkoutUrl: session.url, sessionId: session.id, orderNumber };
  } catch (err: any) {
    logger.error("Failed to create Stripe Checkout session:", err);
    throw new HttpsError("internal", err.message || "Failed to create Stripe checkout session");
  }
});

/**
 * STRIPE WEBHOOK HANDLER
 * Listens for Stripe webhook events: checkout.session.completed, invoice.paid, etc.
 */
export const stripeWebhook = onRequest(async (req, res) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "STRIPE_SECRET_KEY_PLACEHOLDER";
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "STRIPE_WEBHOOK_SECRET_PLACEHOLDER";

  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;

  const sig = req.headers["stripe-signature"] as string | undefined;

  try {
    if (stripeWebhookSecret && stripeWebhookSecret !== "STRIPE_WEBHOOK_SECRET_PLACEHOLDER" && sig) {
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
    } else {
      logger.warn("Processing Stripe webhook without signature verification (STRIPE_WEBHOOK_SECRET not set or missing signature header)");
      event = req.body;
    }
  } catch (err: any) {
    logger.error(`Stripe Webhook Signature Verification Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  logger.info("Stripe webhook received event:", { type: event?.type, id: event?.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info("Stripe Checkout Session completed:", session.id);

        const metadata = session.metadata || {};
        const orderNumber = metadata.orderNumber || `CFY-${Math.floor(100000 + Math.random() * 900000)}`;

        // Prevent duplicate order creation if webhook retries
        const existingDoc = await db.collection("orders").where("stripeSessionId", "==", session.id).get();
        if (!existingDoc.empty) {
          logger.info(`Order for Stripe Session ${session.id} already exists. Skipping duplicate creation.`);
          break;
        }

        let items = [];
        try {
          items = metadata.itemsJson ? JSON.parse(metadata.itemsJson) : [];
        } catch (e) {
          logger.error("Failed to parse itemsJson from session metadata:", e);
        }

        const deliveryAddress = {
          id: Math.random().toString(36).substring(2, 9),
          street: metadata.street || "",
          suburb: metadata.suburb || "",
          state: metadata.state || "NSW",
          postcode: metadata.postcode || "",
          country: metadata.country || "Australia"
        };

        const totalAmount = parseFloat(metadata.totalAmount || "0") || (session.amount_total ? session.amount_total / 100 : 0);
        const subtotal = parseFloat(metadata.subtotal || "0") || totalAmount;
        const discountAmount = parseFloat(metadata.discountAmount || "0");

        const newOrder = {
          orderNumber,
          stripeSessionId: session.id,
          customerId: metadata.customerId || "guest-user",
          customerName: metadata.customerName || session.customer_details?.name || "Customer",
          customerEmail: metadata.customerEmail || session.customer_details?.email || "",
          customerPhone: metadata.customerPhone || session.customer_details?.phone || "",
          items,
          subtotal,
          discountAmount,
          totalAmount,
          currency: "AUD",
          status: "Verified",
          source: "Website",
          paymentMethod: "Stripe",
          deliveryAddress,
          ageConfirmed: true,
          createdAt: new Date().toISOString(),
          statusHistory: [
            { status: "Pending", timestamp: new Date().toISOString() },
            { status: "Verified", timestamp: new Date().toISOString(), updatedBy: "Stripe Webhook Auto-Verify" }
          ],
          archived: false
        };

        // Save order in Firestore
        const docRef = await db.collection("orders").add(newOrder);
        logger.info(`Successfully created order ${docRef.id} (#${orderNumber}) via Stripe webhook.`);

        // Deduct inventory stock
        for (const item of items) {
          if (item.productId) {
            try {
              const pRef = db.collection("products").doc(item.productId);
              await pRef.update({
                stock: admin.firestore.FieldValue.increment(-item.quantity)
              });
            } catch (stErr) {
              logger.error(`Error updating stock for product ${item.productId}:`, stErr);
            }
          }
        }

        // Trigger email notification to admin staff
        try {
          await sendNewOrderAdminNotification(newOrder);
        } catch (emailErr) {
          logger.error("Failed to send admin notification email upon Stripe webhook order creation:", emailErr);
        }

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
