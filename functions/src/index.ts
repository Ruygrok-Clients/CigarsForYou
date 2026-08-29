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
  sendCustomerOrderConfirmationEmail,
  sendTestAdminNotification,
} from "./email";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1", secrets: ["RESEND_API_KEY"] });

function getStripeInstance(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY || "STRIPE_SECRET_KEY_PLACEHOLDER";
  return new Stripe(secretKey);
}

/**
 * CALLABLE FUNCTION: Create Stripe Checkout Session
 * Generates a hosted Stripe Checkout URL for customer order payment.
 */
export const createStripeCheckoutSession = onCall({ cors: true, secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { items, customerEmail, customerName, customerPhone, deliveryAddress, originUrl, subtotal, discountAmount, shippingFee, totalAmount, couponCode } = request.data || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new HttpsError("invalid-argument", "Cart is empty or missing items.");
  }
  if (!customerEmail || !customerName || !deliveryAddress) {
    throw new HttpsError("invalid-argument", "Missing required customer details or delivery address.");
  }

  const stripe = getStripeInstance();
  const orderNumber = `CFY-${Math.floor(100000 + Math.random() * 900000)}`;

  // Calculate discounted item prices directly to guarantee accurate Stripe Checkout charges
  const totalItemSubtotal = items.reduce((acc: number, item: any) => acc + ((item.product?.price || 0) * (item.quantity || 1)), 0) || (subtotal || 0);
  const actualDiscountAmount = typeof discountAmount === "number" ? Math.max(0, Math.min(discountAmount, totalItemSubtotal)) : 0;
  const targetItemsTotalCents = Math.round((totalItemSubtotal - actualDiscountAmount) * 100);

  // If discount is applied, adjust unit price proportionally across items with exact cent precision
  let accumulatedCents = 0;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any, idx: number) => {
    const rawPrice = item.product?.price || 0;
    const quantity = item.quantity || 1;
    let unitAmountInCents: number;

    if (actualDiscountAmount > 0 && totalItemSubtotal > 0) {
      if (idx === items.length - 1) {
        // Last item absorbs any rounding discrepancy
        const remainingCents = Math.max(0, targetItemsTotalCents - accumulatedCents);
        unitAmountInCents = Math.max(1, Math.round(remainingCents / quantity));
      } else {
        const itemProportion = (rawPrice * quantity) / totalItemSubtotal;
        const itemTotalCents = Math.round(targetItemsTotalCents * itemProportion);
        unitAmountInCents = Math.max(1, Math.round(itemTotalCents / quantity));
        accumulatedCents += unitAmountInCents * quantity;
      }
    } else {
      unitAmountInCents = Math.round(rawPrice * 100);
    }

    const discountNote = actualDiscountAmount > 0 && couponCode ? ` (Discount applied: ${couponCode})` : "";
    const description = item.product?.brand ? `Brand: ${item.product.brand}${discountNote}` : (discountNote ? discountNote.trim() : undefined);

    return {
      price_data: {
        currency: "aud",
        product_data: {
          name: item.product?.name || "Cigar Product",
          description: description || undefined,
          images: item.product?.image ? [item.product.image] : (item.product?.imageUrl ? [item.product.imageUrl] : undefined),
        },
        unit_amount: unitAmountInCents,
      },
      quantity: quantity,
    };
  });

  // Add Flat Universal Australia Express Shipping Fee if shipping is not free
  const actualShippingFee = typeof shippingFee === "number" ? shippingFee : 25;
  if (actualShippingFee > 0) {
    lineItems.push({
      price_data: {
        currency: "aud",
        product_data: {
          name: "Australia Flat Rate Express Delivery",
          description: "Universal flat-rate express delivery service with 18+ ID verification upon delivery",
        },
        unit_amount: Math.round(actualShippingFee * 100),
      },
      quantity: 1,
    });
  }

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
    shippingFee: String(actualShippingFee),
    couponCode: couponCode || "",
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
 * Processes a completed Stripe Checkout Session, writes the new order into Firestore,
 * updates inventory, increments coupon usage, and sends email notification.
 * Designed to be idempotent (safe against retries or dual execution from webhook + client return).
 */
export async function processSuccessfulStripeSession(session: Stripe.Checkout.Session) {
  if (!session || !session.id) {
    throw new Error("Invalid Stripe session object");
  }

  logger.info(`Processing Stripe session ${session.id}`, {
    payment_status: session.payment_status,
    status: session.status,
    amount_total: session.amount_total,
    metadata: session.metadata
  });

  // 1. Check if order already exists for this Stripe session
  const existingBySession = await db.collection("orders").where("stripeSessionId", "==", session.id).get();
  if (!existingBySession.empty) {
    const existingDoc = existingBySession.docs[0];
    logger.info(`Order for Stripe Session ${session.id} already exists in Firestore (ID: ${existingDoc.id}).`);
    const data = existingDoc.data() || {};
    return { created: false, orderId: existingDoc.id, order: { id: existingDoc.id, ...data } as any };
  }

  const metadata = session.metadata || {};
  const orderNumber = metadata.orderNumber || session.client_reference_id || `CFY-${Math.floor(100000 + Math.random() * 900000)}`;

  // Also check if order exists by orderNumber
  const existingByNum = await db.collection("orders").where("orderNumber", "==", orderNumber).get();
  if (!existingByNum.empty) {
    const existingDoc = existingByNum.docs[0];
    logger.info(`Order #${orderNumber} already exists in Firestore (ID: ${existingDoc.id}). Updating stripeSessionId...`);
    if (!existingDoc.data().stripeSessionId) {
      await existingDoc.ref.update({
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || ""
      });
    }
    const data = existingDoc.data() || {};
    return { created: false, orderId: existingDoc.id, order: { id: existingDoc.id, ...data } as any };
  }

  // 2. Parse items, amounts, address, and coupon info
  let items: any[] = [];
  try {
    items = metadata.itemsJson ? JSON.parse(metadata.itemsJson) : [];
  } catch (e) {
    logger.error("Failed to parse itemsJson from session metadata:", e);
  }

  // Fallback: list line items from Stripe if itemsJson was missing
  if (!items || items.length === 0) {
    try {
      const stripe = getStripeInstance();
      const stripeLineItems = await stripe.checkout.sessions.listLineItems(session.id);
      items = stripeLineItems.data.map((li) => ({
        productId: (typeof li.price?.product === "string" ? li.price.product : "") || "cigar-item",
        name: li.description || "Cigar Product",
        brand: "",
        price: (li.price?.unit_amount || 0) / 100,
        quantity: li.quantity || 1
      }));
    } catch (liErr) {
      logger.warn("Could not retrieve fallback line items from Stripe session:", liErr);
    }
  }

  const deliveryAddress = {
    id: String(Math.random().toString(36).substring(2, 9)),
    street: String(metadata.street || ""),
    suburb: String(metadata.suburb || ""),
    state: String(metadata.state || "NSW"),
    postcode: String(metadata.postcode || ""),
    country: String(metadata.country || "Australia")
  };

  const totalAmount = parseFloat(metadata.totalAmount || "0") || (session.amount_total ? session.amount_total / 100 : 0);
  const subtotal = parseFloat(metadata.subtotal || "0") || totalAmount;
  const discountAmount = parseFloat(metadata.discountAmount || "0");
  const shippingFee = parseFloat(metadata.shippingFee || "0");
  const couponCode = String(metadata.couponCode || "");
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";

  const nowIso = new Date().toISOString();

  // Thoroughly sanitize newOrder fields to guarantee no undefined values (which rejects Firestore writes)
  const newOrder = {
    orderNumber: String(orderNumber),
    stripeSessionId: String(session.id),
    stripePaymentIntentId: String(paymentIntentId),
    customerId: String(metadata.customerId || "guest-user"),
    customerName: String(metadata.customerName || session.customer_details?.name || "Customer"),
    customerEmail: String(metadata.customerEmail || session.customer_details?.email || ""),
    customerPhone: String(metadata.customerPhone || session.customer_details?.phone || ""),
    items: (items || []).map((i: any) => ({
      productId: String(i.productId || i.id || ""),
      name: String(i.name || "Cigar Product"),
      brand: String(i.brand || ""),
      price: Number(i.price || 0),
      quantity: Number(i.quantity || 1)
    })),
    subtotal: Number(subtotal) || 0,
    discountAmount: Number(discountAmount) || 0,
    shippingFee: Number(shippingFee) || 0,
    couponCode: String(couponCode),
    totalAmount: Number(totalAmount) || 0,
    currency: "AUD",
    status: "Verified",
    source: "Website",
    paymentMethod: "Stripe",
    deliveryAddress,
    ageConfirmed: true,
    createdAt: nowIso,
    paidAt: nowIso,
    statusHistory: [
      { status: "Pending", timestamp: nowIso },
      { status: "Verified", timestamp: nowIso, updatedBy: "Stripe Checkout Paid" }
    ],
    archived: false
  };

  // 3. Save order document into Firestore
  const docRef = await db.collection("orders").add(newOrder);
  logger.info(`Successfully created order ${docRef.id} (#${orderNumber}) in Firestore via Stripe Checkout completion.`);

  // 4. Increment coupon usage counter if applied
  if (couponCode) {
    const codes = couponCode.split(",").map((c: string) => c.trim().toUpperCase()).filter(Boolean);
    for (const cleanCode of codes) {
      try {
        const couponRef = db.collection("coupons").doc(cleanCode);
        const couponSnap = await couponRef.get();
        if (couponSnap.exists) {
          await couponRef.update({
            timesClaimed: admin.firestore.FieldValue.increment(1),
            usedCount: admin.firestore.FieldValue.increment(1)
          });
          logger.info(`Incremented usage counter for coupon document ${cleanCode}`);
        }
      } catch (cErr) {
        logger.error(`Error updating usage count for coupon ${cleanCode}:`, cErr);
      }
    }
  }

  // 5. Deduct inventory stock for purchased items
  for (const item of items) {
    const pId = item.productId;
    if (pId) {
      try {
        const pRef = db.collection("products").doc(pId);
        const pSnap = await pRef.get();
        if (pSnap.exists) {
          await pRef.update({
            stock: admin.firestore.FieldValue.increment(-item.quantity)
          });
          logger.info(`Successfully deducted ${item.quantity} stock for product document ${pId}`);
        } else {
          // Fallback: match by slug or product name if doc ID wasn't direct match
          const queryBySlug = await db.collection("products").where("slug", "==", pId).get();
          if (!queryBySlug.empty) {
            await queryBySlug.docs[0].ref.update({
              stock: admin.firestore.FieldValue.increment(-item.quantity)
            });
            logger.info(`Successfully deducted ${item.quantity} stock for product with slug ${pId}`);
          } else if (item.name) {
            const queryByName = await db.collection("products").where("name", "==", item.name).get();
            if (!queryByName.empty) {
              await queryByName.docs[0].ref.update({
                stock: admin.firestore.FieldValue.increment(-item.quantity)
              });
              logger.info(`Successfully deducted ${item.quantity} stock for product with name "${item.name}"`);
            }
          }
        }
      } catch (stErr) {
        logger.error(`Error updating stock for product ${pId}:`, stErr);
      }
    }
  }

  return { created: true, orderId: docRef.id, order: { id: docRef.id, ...newOrder } as any };
}

/**
 * CALLABLE FUNCTION: Verify Stripe Order & Write to Firestore
 * Called by frontend when customer returns to checkout page with success=true&session_id=...
 */
export const verifyStripeOrder = onCall({ cors: true, secrets: ["STRIPE_SECRET_KEY"] }, async (request) => {
  const { sessionId } = request.data || {};
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "Missing Stripe session ID");
  }

  logger.info(`verifyStripeOrder invoked for session ${sessionId}`);

  const stripe = getStripeInstance();
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      throw new HttpsError("not-found", "Stripe session not found");
    }

    const isPaid = session.payment_status === "paid" || session.payment_status === "no_payment_required" || session.status === "complete";
    if (!isPaid) {
      logger.warn(`Stripe session ${sessionId} is not yet paid (payment_status: ${session.payment_status}, status: ${session.status})`);
      throw new HttpsError("failed-precondition", `Stripe session payment status is '${session.payment_status}'`);
    }

    const result = await processSuccessfulStripeSession(session);
    return {
      success: true,
      orderNumber: (result.order as any).orderNumber,
      orderId: result.orderId,
      order: result.order
    };
  } catch (err: any) {
    logger.error(`Error verifying Stripe order for session ${sessionId}:`, err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || "Failed to verify Stripe order");
  }
});

/**
 * STRIPE WEBHOOK HANDLER
 * Listens for Stripe webhook events: checkout.session.completed, invoice.paid, etc.
 */
export const stripeWebhook = onRequest({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] }, async (req, res) => {
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
        logger.info("Stripe Checkout Session completed event received:", session.id);
        await processSuccessfulStripeSession(session);
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
  }
);

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
        paymentMethod: "Credit Card (Stripe)",
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
