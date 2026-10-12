import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {
  sendNewOrderAdminNotification,
  sendOutOfStockAdminAlert,
  sendStockNotificationAdminAlert,
  sendCustomerEnquiryAdminAlert,
  sendB2BEnquiryAdminAlert,
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
import { applyPurchaseCounts } from "./purchaseCounts";
import { placeRewardOrderForUser, reevaluateLoyaltyTiers, syncOrderRewards } from "./rewards";
import {
  allocateOrderStockForOrder,
  applyStockConflictDefaults as applyStockConflictDefaultsJob,
  getOrderStockIssueForCaller,
  placeCatalogOrderForUser,
  resolveStockConflictForOrder,
} from "./stockAllocation";
import { rewriteFbtCompanions } from "./fbtCompanions";
import { googleMapsApiKey } from "./immediateDispatchFee";
import {
  shouldNotifyCategory,
  shouldNotifyNews,
  shouldNotifyProduct,
  submitIndexNowUrls,
  urlsForCategoryChange,
  urlsForNewsChange,
  urlsForProductChange,
} from "./indexNow";

export { createDiditSession, getDiditStatus, claimDiditForUser, completeSignup, diditWebhook } from "./didit";
export { quoteImmediateDispatch } from "./immediateDispatchFee";
export { resolveImmediateDispatch } from "./immediateDispatchRemediation";
export { advanceOrderStatus } from "./advanceOrderStatus";

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: "us-central1", secrets: ["RESEND_API_KEY"] });

/**
 * Awards points when a non-reward order is paid, and claws them back if it is
 * later cancelled or refunded. Reward orders never earn points.
 */
export const syncOrderRewardsOnWrite = onDocumentWritten("orders/{orderId}", async (event) => {
  if (!event.data?.after.exists) return;
  const orderId = event.params.orderId;
  const errors: unknown[] = [];
  try {
    await syncOrderRewards(orderId);
  } catch (err) {
    logger.error(`Rewards sync failed for order ${orderId}:`, err);
    errors.push(err);
  }
  try {
    await applyPurchaseCounts(orderId);
  } catch (err) {
    logger.error(`Purchase count update failed for order ${orderId}:`, err);
    errors.push(err);
  }
  if (errors.length > 0) throw errors[0];
});

/**
 * Places a reward redemption as an order. Refuses while payments are paused
 * (set REWARD_ORDERS_ENABLED=true once the payment processor is live).
 */
export const placeRewardOrder = onCall({ secrets: [googleMapsApiKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to redeem rewards.");
  }
  return placeRewardOrderForUser(uid, request.data || {});
});

function orderIdFrom(data: unknown): string {
  const orderId = typeof (data as { orderId?: unknown })?.orderId === "string"
    ? (data as { orderId: string }).orderId.trim()
    : "";
  if (!orderId) {
    throw new HttpsError("invalid-argument", "Order id is required.");
  }
  return orderId;
}

/** After payment, allocate catalog stock. Idempotent. Conflict returns a token for /order-issue. */
export const allocateOrderStock = onCall(async (request) => {
  const orderId = orderIdFrom(request.data);
  await getOrderStockIssueForCaller({
    orderId,
    uid: request.auth?.uid,
    token: (request.data as { token?: unknown })?.token,
  });
  return allocateOrderStockForOrder(orderId);
});

export const getOrderStockIssue = onCall(async (request) => {
  const orderId = orderIdFrom(request.data);
  return getOrderStockIssueForCaller({
    orderId,
    uid: request.auth?.uid,
    token: (request.data as { token?: unknown })?.token,
  });
});

export const resolveStockConflict = onCall({ secrets: ["RESEND_API_KEY"] }, async (request) => {
  const orderId = orderIdFrom(request.data);
  await getOrderStockIssueForCaller({
    orderId,
    uid: request.auth?.uid,
    token: (request.data as { token?: unknown })?.token,
  });
  const mode = (request.data as { mode?: unknown })?.mode;
  if (mode !== "full_cancel" && mode !== "partial") {
    throw new HttpsError("invalid-argument", "Choose a full refund or a line-by-line refund.");
  }
  const actor = request.auth?.token.email || request.auth?.uid || "Customer";
  return resolveStockConflictForOrder({
    orderId,
    mode,
    cancellations: (request.data as { cancellations?: [] })?.cancellations,
    actor,
  });
});

/** Catalog paid-order hook. Refuses storefront callers until PAYMENTS_ENABLED=true. */
export const placeCatalogOrder = onCall({ secrets: [googleMapsApiKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to place an order.");
  }
  return placeCatalogOrderForUser(uid, request.data || {});
});

/** If the customer leaves the stock-issue page, cancel only the quantities we could not allocate. */
export const applyStockConflictDefaults = onSchedule({
  schedule: "every 15 minutes",
  secrets: ["RESEND_API_KEY"],
}, async () => {
  const result = await applyStockConflictDefaultsJob();
  logger.info("Stock conflict defaults applied", result);
});

/**
 * Assigns missing tiers to Bronze (then applies the rolling window), and
 * re-checks Silver, Gold, and recent earners so inactive members can drop.
 */
export const reevaluateLoyaltyTiersDaily = onSchedule("every 24 hours", async () => {
  await reevaluateLoyaltyTiers();
});

/** First of each month, Sydney time. Rewrites each product's three Frequently Bought Together companions from lifetime orders. */
export const assignAccessoryFbtFeatured = onSchedule({
  schedule: "15 0 1 * *",
  timeZone: "Australia/Sydney",
}, async () => {
  await rewriteFbtCompanions(db);
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
 * Viewer counts are published separately by publishLiveSiteViewers.
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
 * Prune stale site-presence sessions and publish the display viewer count
 * (fresh base 5–12 allocated across sinks + products, plus real live presence)
 * to social_proof_live/site_viewers.
 */
export const publishLiveSiteViewers = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Australia/Sydney",
    retryCount: 0,
  },
  async () => {
    const result = await publishLiveSiteViewersSocialProof();
    logger.info("Live site viewers publish finished.", result);
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
 * FIRESTORE TRIGGER: NEW CUSTOMER ENQUIRY
 * Sends a Resend notification from noreply@ to hello@cigarsforyou.com.au.
 */
export const onEnquiryCreated = onDocumentCreated(
  { document: "enquiries/{enquiryId}", secrets: ["RESEND_API_KEY"] },
  async (event) => {
    const enquiry = event.data?.data();
    if (!enquiry) return;

    logger.info(`New customer enquiry from ${enquiry.email}. Sending Resend alert to hello@cigarsforyou.com.au...`);
    try {
      await sendCustomerEnquiryAdminAlert(enquiry);
    } catch (err) {
      logger.error("Failed to process Resend customer enquiry email:", err);
    }
  }
);

/**
 * FIRESTORE TRIGGER: NEW B2B PARTNERSHIP ENQUIRY
 * Sends a Resend notification from noreply@ to hello@cigarsforyou.com.au.
 */
export const onB2BEnquiryCreated = onDocumentCreated(
  { document: "b2bEnquiries/{enquiryId}", secrets: ["RESEND_API_KEY"] },
  async (event) => {
    const enquiry = event.data?.data();
    if (!enquiry) return;

    logger.info(`New B2B enquiry from ${enquiry.email} (${enquiry.businessName}). Sending Resend alert to hello@cigarsforyou.com.au...`);
    try {
      await sendB2BEnquiryAdminAlert(enquiry);
    } catch (err) {
      logger.error("Failed to process Resend B2B enquiry email:", err);
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

/**
 * IndexNow: notify Bing (and other IndexNow engines) when catalogue URLs change.
 * Skips stock-only / FBT-only product writes so monthly companion jobs do not spam submissions.
 */
export const onProductIndexNow = onDocumentWritten(
  "products/{productId}",
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    if (!shouldNotifyProduct(before, after)) return;
    await submitIndexNowUrls(urlsForProductChange(before, after));
  }
);

/** IndexNow for category add / rename / delete. */
export const onCatalogCategoryIndexNow = onDocumentWritten(
  "catalogCategories/{categoryId}",
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    if (!shouldNotifyCategory(before, after)) return;
    await submitIndexNowUrls(urlsForCategoryChange(before, after));
  }
);

/** IndexNow for news publish / update / unpublish / delete. */
export const onNewsPostIndexNow = onDocumentWritten(
  "newsPosts/{postId}",
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    if (!shouldNotifyNews(before, after)) return;
    await submitIndexNowUrls(urlsForNewsChange(before, after, event.params.postId));
  }
);
