import { Resend } from "resend";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

export const NOTIFICATIONS_FROM_EMAIL =
  process.env.RESEND_NOTIFICATIONS_FROM_EMAIL ||
  process.env.RESEND_FROM_EMAIL ||
  "CigarsForYou Notifications <notifications@cigarsforyou.com.au>";

export const ORDERS_FROM_EMAIL =
  process.env.RESEND_ORDERS_FROM_EMAIL ||
  "CigarsForYou Orders <orders@cigarsforyou.com.au>";

const DEFAULT_ADMIN_FALLBACK_EMAIL = "notifications@cigarsforyou.com.au";

/**
 * Fetch all admin staff recipient emails from Firestore users collection
 * where role is 'admin' or 'member'.
 */
export async function getAdminStaffEmails(): Promise<string[]> {
  const emails = new Set<string>();

  try {
    const db = admin.firestore();
    const snap = await db
      .collection("users")
      .where("role", "in", ["admin", "member"])
      .get();

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.email && typeof data.email === "string" && data.email.includes("@")) {
        emails.add(data.email.trim().toLowerCase());
      }
    });
  } catch (err) {
    logger.error("Error fetching admin staff emails from Firestore users collection:", err);
  }

  // Also include any fallback/configured admin emails from environment variables if specified
  if (process.env.ADMIN_NOTIFICATION_EMAILS) {
    const envEmails = process.env.ADMIN_NOTIFICATION_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
    envEmails.forEach((e) => emails.add(e));
  }

  // Sensible default fallback if no staff documents exist yet in Firestore
  if (emails.size === 0) {
    emails.add(DEFAULT_ADMIN_FALLBACK_EMAIL);
  }

  return Array.from(emails);
}

/**
 * Helper to dispatch email via Resend SDK
 */
export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = params.from || NOTIFICATIONS_FROM_EMAIL;
  const toList = Array.isArray(params.to)
    ? params.to.filter((e) => typeof e === "string" && e.includes("@"))
    : [params.to].filter((e) => typeof e === "string" && e.includes("@"));

  if (toList.length === 0) {
    logger.warn("No valid recipient emails provided for email dispatch.", {
      subject: params.subject,
      from: fromEmail,
    });
    return { success: false, reason: "No valid recipient emails provided" };
  }

  if (!apiKey || apiKey === "RESEND_API_KEY_PLACEHOLDER") {
    logger.warn(
      "[RESEND SIMULATION] RESEND_API_KEY is not configured. Email logged to console instead of sending.",
      {
        from: fromEmail,
        to: toList,
        subject: params.subject,
      }
    );
    return { success: true, simulated: true };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: fromEmail,
      to: toList,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });

    if (response.error) {
      logger.error("Resend API returned an error:", response.error);
      return { success: false, error: response.error.message || String(response.error) };
    }

    logger.info("Successfully dispatched email via Resend", {
      id: response.data?.id,
      from: fromEmail,
      toCount: toList.length,
      to: toList,
      subject: params.subject,
    });

    return { success: true, id: response.data?.id };
  } catch (err: any) {
    logger.error("Failed to send notification email via Resend exception:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Common HTML wrapper with CigarsForYou Admin notification styling
 */
function wrapAdminEmailTemplate(title: string, bodyContent: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f1115;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #e5e7eb;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #171a21;
        border: 1px solid #2a2e39;
        border-radius: 8px;
        overflow: hidden;
      }
      .header {
        background-color: #111318;
        padding: 24px;
        text-align: center;
        border-bottom: 2px solid #c06517;
      }
      .header h1 {
        margin: 0;
        color: #d4af37;
        font-size: 22px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
      }
      .header p {
        margin: 4px 0 0 0;
        color: #9ca3af;
        font-size: 12px;
        letter-spacing: 0.5px;
      }
      .content {
        padding: 28px 24px;
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .badge-gold { background-color: rgba(212, 175, 55, 0.15); color: #d4af37; border: 1px solid rgba(212, 175, 55, 0.3); }
      .badge-red { background-color: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
      .badge-blue { background-color: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
      .info-box {
        background-color: #212530;
        border-left: 4px solid #c06517;
        padding: 16px;
        border-radius: 4px;
        margin: 20px 0;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .info-label { color: #9ca3af; }
      .info-val { color: #f3f4f6; font-weight: 600; }
      table.data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 13px;
      }
      table.data-table th {
        background-color: #111318;
        color: #9ca3af;
        text-align: left;
        padding: 10px;
        border-bottom: 1px solid #2a2e39;
      }
      table.data-table td {
        padding: 10px;
        border-bottom: 1px solid #222632;
        color: #d1d5db;
      }
      .footer {
        background-color: #111318;
        padding: 16px 24px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        border-top: 1px solid #2a2e39;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>CigarsForYou</h1>
        <p>Admin Notification System • notifications@cigarsforyou.com.au</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        Automated alert dispatched to CigarsForYou staff • Confidential
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Common HTML wrapper with CigarsForYou Customer Order Confirmation Receipt styling
 */
function wrapCustomerEmailTemplate(title: string, bodyContent: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0d0f12;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #e5e7eb;
      }
      .container {
        max-width: 620px;
        margin: 24px auto;
        background-color: #161920;
        border: 1px solid #282d38;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }
      .header {
        background: linear-gradient(180deg, #1b1f28 0%, #111318 100%);
        padding: 32px 24px 24px 24px;
        text-align: center;
        border-bottom: 2px solid #c06517;
      }
      .header h1 {
        margin: 0;
        color: #d4af37;
        font-size: 26px;
        letter-spacing: 2px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .header p {
        margin: 6px 0 0 0;
        color: #d1d5db;
        font-size: 13px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .content {
        padding: 32px 28px;
      }
      .badge-success {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        background-color: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.35);
        margin-bottom: 12px;
      }
      .order-hero {
        text-align: center;
        margin-bottom: 28px;
      }
      .order-hero h2 {
        margin: 4px 0 8px 0;
        color: #ffffff;
        font-size: 24px;
      }
      .order-hero p {
        margin: 0;
        color: #9ca3af;
        font-size: 14px;
      }
      .summary-card {
        background-color: #1c202a;
        border: 1px solid #2d3342;
        border-radius: 8px;
        padding: 18px 20px;
        margin-bottom: 24px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 14px;
      }
      .summary-label { color: #9ca3af; }
      .summary-val { color: #f3f4f6; font-weight: 600; text-align: right; }
      table.receipt-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 14px;
      }
      table.receipt-table th {
        background-color: #12141a;
        color: #9ca3af;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.5px;
        padding: 12px 10px;
        border-bottom: 1px solid #2d3342;
        text-align: left;
      }
      table.receipt-table td {
        padding: 14px 10px;
        border-bottom: 1px solid #222733;
        color: #e5e7eb;
        vertical-align: top;
      }
      .product-title {
        font-weight: 700;
        color: #ffffff;
        font-size: 14px;
      }
      .product-sub {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 2px;
      }
      .totals-container {
        background-color: #1c202a;
        border-radius: 8px;
        padding: 16px 20px;
        margin-top: 16px;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 14px;
        color: #d1d5db;
      }
      .grand-total {
        display: flex;
        justify-content: space-between;
        padding-top: 12px;
        margin-top: 8px;
        border-top: 1px solid #374151;
        font-size: 18px;
        font-weight: 700;
        color: #d4af37;
      }
      .notice-box {
        background-color: rgba(192, 101, 23, 0.1);
        border-left: 3px solid #c06517;
        padding: 14px 16px;
        border-radius: 4px;
        margin: 24px 0 16px 0;
        font-size: 13px;
        color: #e5e7eb;
        line-height: 1.5;
      }
      .footer {
        background-color: #111318;
        padding: 24px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        border-top: 1px solid #282d38;
        line-height: 1.6;
      }
      .footer a {
        color: #c06517;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>CigarsForYou</h1>
        <p>Premium Cuban Cigars & Luxury Tobacco</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;"><strong>CigarsForYou Australia</strong> • Premium Cigar Importers</p>
        <p style="margin: 0 0 8px 0;">Need help with your order? Reply directly to this email or contact us at <a href="mailto:orders@cigarsforyou.com.au">orders@cigarsforyou.com.au</a></p>
        <p style="margin: 0; font-size: 11px; color: #4b5563;">You are receiving this order confirmation because you placed an order on cigarsforyou.com.au.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * 1. Send Notification Email to Admin Staff for NEW ORDER
 * From: notifications@cigarsforyou.com.au
 */
export async function sendNewOrderAdminNotification(order: any) {
  const staffEmails = await getAdminStaffEmails();
  if (staffEmails.length === 0) {
    logger.warn("Skipping New Order admin alert: no staff recipients found.");
    return { success: false, reason: "No staff recipients" };
  }

  const itemsHtml = (order.items || [])
    .map(
      (item: any) => `
    <tr>
      <td><strong>${item.name || "Product"}</strong><br><span style="font-size: 11px; color: #9ca3af;">${item.brand || ""}</span></td>
      <td style="text-align: center;">${item.quantity || 1}</td>
      <td style="text-align: right;">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)} AUD</td>
    </tr>`
    )
    .join("");

  const addressText = order.deliveryAddress
    ? `${order.deliveryAddress.street || ""}, ${order.deliveryAddress.suburb || ""} ${order.deliveryAddress.state || ""} ${order.deliveryAddress.postcode || ""}, ${order.deliveryAddress.country || "AU"}`
    : "N/A";

  const bodyContent = `
    <span class="badge badge-gold">New Customer Order</span>
    <h2 style="color: #f3f4f6; margin-top: 12px; margin-bottom: 4px;">Order #${order.orderNumber}</h2>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 0;">Placed on ${new Date(order.createdAt || Date.now()).toLocaleString("en-AU")}</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Customer Name:</span>
        <span class="info-val">${order.customerName || "Guest Customer"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer Email:</span>
        <span class="info-val">${order.customerEmail || "N/A"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer Phone:</span>
        <span class="info-val">${order.customerPhone || "N/A"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Method:</span>
        <span class="info-val">${order.paymentMethod || "Stripe"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total Amount:</span>
        <span class="info-val" style="color: #d4af37;">$${Number(order.totalAmount || 0).toFixed(2)} AUD</span>
      </div>
    </div>

    <h3 style="color: #e5e7eb; font-size: 15px; margin-top: 24px; margin-bottom: 8px;">Order Items</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Item Details</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <p style="font-size: 13px; color: #9ca3af; margin-top: 16px;">
      <strong>Delivery Address:</strong><br>
      ${addressText}
    </p>
  `;

  const subject = `🛒 New Order Placed: #${order.orderNumber} ($${Number(order.totalAmount || 0).toFixed(2)} AUD)`;
  const html = wrapAdminEmailTemplate("New Order Placed", bodyContent);

  return sendResendEmail({
    from: NOTIFICATIONS_FROM_EMAIL,
    to: staffEmails,
    subject,
    html,
  });
}

/**
 * 2. Send Notification Email to Admin Staff when PRODUCT GOES OUT OF STOCK
 * From: notifications@cigarsforyou.com.au
 */
export async function sendOutOfStockAdminAlert(product: any, productId: string) {
  const staffEmails = await getAdminStaffEmails();
  if (staffEmails.length === 0) {
    logger.warn("Skipping Out of Stock notification: no staff recipients found.");
    return { success: false, reason: "No staff recipients" };
  }

  const bodyContent = `
    <span class="badge badge-red">Inventory Alert • Out of Stock</span>
    <h2 style="color: #ef4444; margin-top: 12px; margin-bottom: 4px;">${product.name || "Product"}</h2>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 0;">Brand: <strong>${product.brand || "N/A"}</strong></p>
    
    <div class="info-box" style="border-left-color: #ef4444;">
      <div class="info-row">
        <span class="info-label">Stock Status:</span>
        <span class="info-val" style="color: #ef4444;">0 units (OUT OF STOCK)</span>
      </div>
      <div class="info-row">
        <span class="info-label">Category:</span>
        <span class="info-val">${product.category || "cigars"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Origin:</span>
        <span class="info-val">${product.origin || "N/A"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Unit Price:</span>
        <span class="info-val">$${Number(product.price || 0).toFixed(2)} AUD</span>
      </div>
      <div class="info-row">
        <span class="info-label">Product ID:</span>
        <span class="info-val" style="font-family: monospace; font-size: 12px;">${productId}</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #d1d5db;">
      This product's inventory level has reached 0. Please arrange stock replenishment or update product visibility in the admin portal to maintain accurate catalog availability for customers.
    </p>
  `;

  const subject = `⚠️ Product Out of Stock Alert: ${product.name} (${product.brand || "Cigars"})`;
  const html = wrapAdminEmailTemplate("Product Out of Stock", bodyContent);

  return sendResendEmail({
    from: NOTIFICATIONS_FROM_EMAIL,
    to: staffEmails,
    subject,
    html,
  });
}

/**
 * 3. Send Notification Email to Admin Staff when A NEW STOCK NOTIFICATION REQUEST IS CREATED
 * From: notifications@cigarsforyou.com.au
 */
export async function sendStockNotificationAdminAlert(notification: any) {
  const staffEmails = await getAdminStaffEmails();
  if (staffEmails.length === 0) {
    logger.warn("Skipping Stock Notification request alert: no staff recipients found.");
    return { success: false, reason: "No staff recipients" };
  }

  const bodyContent = `
    <span class="badge badge-blue">Customer Restock Request</span>
    <h2 style="color: #60a5fa; margin-top: 12px; margin-bottom: 4px;">New Stock Notification Request</h2>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 0;">Submitted on ${new Date(notification.requestedAt || Date.now()).toLocaleString("en-AU")}</p>
    
    <div class="info-box" style="border-left-color: #3b82f6;">
      <div class="info-row">
        <span class="info-label">Customer Email:</span>
        <span class="info-val" style="color: #60a5fa;">${notification.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested Product:</span>
        <span class="info-val">${notification.productName} (${notification.productBrand || "Cigar"})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Product ID / Slug:</span>
        <span class="info-val" style="font-family: monospace; font-size: 12px;">${notification.productId}</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #d1d5db;">
      A customer has registered interest to be notified as soon as <strong>${notification.productName}</strong> returns to stock.
    </p>
  `;

  const subject = `🔔 New Stock Notification Request: ${notification.productName} (${notification.email})`;
  const html = wrapAdminEmailTemplate("Stock Notification Request", bodyContent);

  return sendResendEmail({
    from: NOTIFICATIONS_FROM_EMAIL,
    to: staffEmails,
    subject,
    html,
  });
}

/**
 * 4. Send Order Confirmation Email to Customer upon SUCCESSFUL PURCHASE
 * From: orders@cigarsforyou.com.au
 */
export async function sendCustomerOrderConfirmationEmail(order: any) {
  const customerEmail = order.customerEmail;
  if (!customerEmail || !customerEmail.includes("@")) {
    logger.warn("Skipping customer order confirmation email: no valid customer email.", {
      orderNumber: order.orderNumber,
    });
    return { success: false, reason: "No valid customer email" };
  }

  const itemsHtml = (order.items || [])
    .map((item: any) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      return `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #222733;">
          <div class="product-title">${item.name || "Cigar Selection"}</div>
          <div class="product-sub">${item.brand || "Premium Cigar"}${item.isSubscription ? " • Subscription" : ""}</div>
        </td>
        <td style="text-align: center; padding: 12px 10px; border-bottom: 1px solid #222733; color: #d1d5db;">
          ${item.quantity || 1}
        </td>
        <td style="text-align: right; padding: 12px 10px; border-bottom: 1px solid #222733; color: #d1d5db;">
          $${Number(item.price || 0).toFixed(2)}
        </td>
        <td style="text-align: right; padding: 12px 10px; border-bottom: 1px solid #222733; font-weight: 600; color: #ffffff;">
          $${itemTotal.toFixed(2)} AUD
        </td>
      </tr>`;
    })
    .join("");

  const address = order.deliveryAddress;
  const addressFormatted = address
    ? `${address.street || ""}<br>${address.suburb || ""} ${address.state || ""} ${address.postcode || ""}<br>${address.country || "Australia"}`
    : "Standard Express Delivery";

  const subtotal = Number(order.subtotal || order.totalAmount || 0);
  const discount = Number(order.discountAmount || 0);
  const shipping = Number(order.shippingFee || 0);
  const grandTotal = Number(order.totalAmount || 0);

  const bodyContent = `
    <div class="order-hero">
      <span class="badge-success">✓ Order Confirmed & Paid</span>
      <h2>Thank You for Your Order, ${order.customerName || "Valued Customer"}!</h2>
      <p>We've received your order and our master tobacconists are carefully preparing your cigars for dispatch.</p>
    </div>

    <div class="summary-card">
      <div class="summary-row">
        <span class="summary-label">Order Number:</span>
        <span class="summary-val" style="color: #d4af37; font-family: monospace; font-size: 15px;">#${order.orderNumber}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Order Date:</span>
        <span class="summary-val">${new Date(order.createdAt || Date.now()).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Payment Method:</span>
        <span class="summary-val">${order.paymentMethod || "Credit Card (Stripe)"}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Payment Status:</span>
        <span class="summary-val" style="color: #34d399;">Paid in Full</span>
      </div>
    </div>

    <h3 style="color: #f3f4f6; font-size: 16px; margin: 24px 0 12px 0; letter-spacing: 0.5px;">Your Cigar Selection</h3>
    <table class="receipt-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-container">
      <div class="total-line">
        <span>Items Subtotal:</span>
        <span>$${subtotal.toFixed(2)} AUD</span>
      </div>
      ${
        discount > 0
          ? `
      <div class="total-line" style="color: #34d399;">
        <span>Discount Applied${order.couponCode ? ` (${order.couponCode})` : ""}:</span>
        <span>-$${discount.toFixed(2)} AUD</span>
      </div>`
          : ""
      }
      <div class="total-line">
        <span>Shipping (Express Courier):</span>
        <span>${shipping > 0 ? `$${shipping.toFixed(2)} AUD` : "FREE"}</span>
      </div>
      <div class="grand-total">
        <span>Total Paid:</span>
        <span>$${grandTotal.toFixed(2)} AUD</span>
      </div>
    </div>

    <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr; gap: 16px;">
      <div class="summary-card" style="margin-bottom: 0;">
        <h4 style="margin: 0 0 8px 0; color: #d4af37; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Delivery Address</h4>
        <div style="font-size: 14px; line-height: 1.6; color: #e5e7eb;">
          <strong>${order.customerName || "Customer"}</strong><br>
          ${addressFormatted}
          ${order.customerPhone ? `<br><span style="color: #9ca3af; font-size: 13px;">Phone: ${order.customerPhone}</span>` : ""}
        </div>
      </div>
    </div>

    <div class="notice-box">
      <strong style="color: #d4af37;">🌿 Humidity-Controlled Freshness Guarantee:</strong><br>
      Every cigar order is individually inspected and shipped in sealed, airtight humidor pouches with <strong>Boveda 2-way humidity control packs</strong> to guarantee maximum freshness upon arrival.
      <br><br>
      <strong style="color: #ef4444;">🔞 18+ Photo ID Verification Required:</strong><br>
      In accordance with Australian tobacco regulations, a government-issued photo ID proving age 18+ must be presented upon courier delivery.
    </div>
  `;

  const subject = `✨ Order Confirmation #${order.orderNumber} - CigarsForYou`;
  const html = wrapCustomerEmailTemplate("Order Confirmation - CigarsForYou", bodyContent);

  return sendResendEmail({
    from: ORDERS_FROM_EMAIL,
    to: [customerEmail],
    replyTo: "orders@cigarsforyou.com.au",
    subject,
    html,
  });
}

/**
 * 5. Send Test Email Notification for Admin Portal Verification
 * From: notifications@cigarsforyou.com.au
 */
export async function sendTestAdminNotification(targetEmails?: string[]) {
  const staffEmails =
    targetEmails && targetEmails.length > 0
      ? targetEmails
      : await getAdminStaffEmails();

  const bodyContent = `
    <span class="badge badge-gold">System Diagnostic</span>
    <h2 style="color: #d4af37; margin-top: 12px; margin-bottom: 4px;">Resend Email System Active</h2>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 0;">Tested on ${new Date().toLocaleString("en-AU")}</p>
    
    <div class="info-box">
      <p style="margin: 0 0 10px 0; color: #e5e7eb; font-size: 14px;">
        ✓ <strong>Admin Alerts:</strong> Configured to send under <code style="color: #d4af37;">notifications@cigarsforyou.com.au</code> for new orders, out of stock alerts, and customer back-in-stock notifications.
      </p>
      <p style="margin: 0; color: #e5e7eb; font-size: 14px;">
        ✓ <strong>Customer Confirmations:</strong> Configured to send under <code style="color: #d4af37;">orders@cigarsforyou.com.au</code> upon successful order placement with complete receipt details.
      </p>
    </div>
  `;

  const subject = "🧪 Resend Email Test Notification - CigarsForYou Admin Portal";
  const html = wrapAdminEmailTemplate("Resend Integration Test", bodyContent);

  return sendResendEmail({
    from: NOTIFICATIONS_FROM_EMAIL,
    to: staffEmails,
    subject,
    html,
  });
}
