import { Resend } from "resend";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

const DEFAULT_FROM_EMAIL = "CigarsForYou <notifications@cigarsforyou.com.au>";

/**
 * Fetch all admin staff recipient emails from Firestore users collection
 * where role is 'admin' or 'member'.
 */
export async function getAdminStaffEmails(): Promise<string[]> {
  const emails = new Set<string>();

  try {
    const db = admin.firestore();
    const snap = await db.collection("users")
      .where("role", "in", ["admin", "member"])
      .get();

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.email && typeof data.email === "string") {
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
      .filter(Boolean);
    envEmails.forEach((e) => emails.add(e));
  }

  return Array.from(emails);
}

/**
 * Helper to dispatch email via Resend SDK
 */
async function sendResendEmail(params: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

  if (!params.to || params.to.length === 0) {
    logger.warn("No admin staff recipient emails found for notification dispatch.", { subject: params.subject });
    return { success: false, reason: "No recipients available" };
  }

  if (!apiKey || apiKey === "RESEND_API_KEY_PLACEHOLDER") {
    logger.warn("[RESEND SIMULATION] RESEND_API_KEY is not configured. Email logged to console instead of sending.", {
      from: fromEmail,
      to: params.to,
      subject: params.subject,
    });
    return { success: true, simulated: true };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    logger.info("Successfully dispatched notification email via Resend", {
      id: result.data?.id,
      toCount: params.to.length,
      subject: params.subject,
    });

    return { success: true, id: result.data?.id };
  } catch (err: any) {
    logger.error("Failed to send notification email via Resend:", err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Common HTML wrapper with CigarsForYou brand layout styling
 */
function wrapEmailTemplate(title: string, bodyContent: string): string {
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
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .header p {
        margin: 4px 0 0 0;
        color: #9ca3af;
        font-size: 12px;
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
      .button {
        display: inline-block;
        background-color: #c06517;
        color: #ffffff !important;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        margin-top: 16px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>CigarsForYou</h1>
        <p>Admin Staff Notification System</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        Automated alert sent to CigarsForYou portal staff • Confidential
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * 1. Send Notification Email to Admin Staff for NEW ORDER
 */
export async function sendNewOrderAdminNotification(order: any) {
  const staffEmails = await getAdminStaffEmails();
  if (staffEmails.length === 0) {
    logger.warn("Skipping New Order notification: no staff recipients found.");
    return;
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
        <span class="info-label">Payment Method:</span>
        <span class="info-val">${order.paymentMethod || "Stripe"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total Amount:</span>
        <span class="info-val" style="color: #d4af37;">$${Number(order.totalAmount || 0).toFixed(2)} AUD</span>
      </div>
    </div>

    <h3 style="color: #e5e7eb; font-size: 15px; margin-top: 24px;">Order Items</h3>
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
  const html = wrapEmailTemplate("New Order Placed", bodyContent);

  return sendResendEmail({ to: staffEmails, subject, html });
}

/**
 * 2. Send Notification Email to Admin Staff when PRODUCT GOES OUT OF STOCK
 */
export async function sendOutOfStockAdminAlert(product: any, productId: string) {
  const staffEmails = await getAdminStaffEmails();
  if (staffEmails.length === 0) {
    logger.warn("Skipping Out of Stock notification: no staff recipients found.");
    return;
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
      This product's inventory level has dropped to 0. Please arrange stock replenishment or update product visibility in the admin portal to maintain accurate catalog availability for customers.
    </p>
  `;

  const subject = `⚠️ Product Out of Stock Alert: ${product.name} (${product.brand})`;
  const html = wrapEmailTemplate("Product Out of Stock", bodyContent);

  return sendResendEmail({ to: staffEmails, subject, html });
}

/**
 * 3. Send Notification Email to Admin Staff when A NEW STOCK NOTIFICATION REQUEST IS CREATED
 */
export async function sendStockNotificationAdminAlert(notification: any) {
  const staffEmails = await getAdminStaffEmails();
  if (staffEmails.length === 0) {
    logger.warn("Skipping Stock Notification request alert: no staff recipients found.");
    return;
  }

  const bodyContent = `
    <span class="badge badge-blue">Customer Request</span>
    <h2 style="color: #60a5fa; margin-top: 12px; margin-bottom: 4px;">New Stock Notification Request</h2>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 0;">Submitted on ${new Date(notification.requestedAt || Date.now()).toLocaleString("en-AU")}</p>
    
    <div class="info-box" style="border-left-color: #3b82f6;">
      <div class="info-row">
        <span class="info-label">Customer Email:</span>
        <span class="info-val" style="color: #60a5fa;">${notification.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested Product:</span>
        <span class="info-val">${notification.productName} (${notification.productBrand})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Product ID:</span>
        <span class="info-val" style="font-family: monospace; font-size: 12px;">${notification.productId}</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #d1d5db;">
      A customer has registered interest to be notified when <strong>${notification.productName}</strong> returns to stock. When this product's inventory is updated above 0, an automated alert can be sent.
    </p>
  `;

  const subject = `🔔 New Stock Notification Request: ${notification.productName} (${notification.email})`;
  const html = wrapEmailTemplate("Stock Notification Request", bodyContent);

  return sendResendEmail({ to: staffEmails, subject, html });
}

/**
 * Send Test Email Notification for Admin Portal Verification
 */
export async function sendTestAdminNotification(targetEmails?: string[]) {
  const staffEmails = targetEmails && targetEmails.length > 0 ? targetEmails : await getAdminStaffEmails();

  const bodyContent = `
    <span class="badge badge-gold">System Diagnostic</span>
    <h2 style="color: #d4af37; margin-top: 12px; margin-bottom: 4px;">Resend Email System Active</h2>
    <p style="color: #9ca3af; font-size: 14px; margin-top: 0;">Tested on ${new Date().toLocaleString("en-AU")}</p>
    
    <div class="info-box">
      <p style="margin: 0; color: #e5e7eb; font-size: 14px;">
        This test email confirms that your Resend notification integration is successfully configured.
        Admin staff will receive automated email alerts for new orders, stock depletion, and customer back-in-stock notification requests.
      </p>
    </div>
  `;

  const subject = "🧪 Resend Email Test Notification - CigarsForYou Admin Portal";
  const html = wrapEmailTemplate("Resend Integration Test", bodyContent);

  return sendResendEmail({ to: staffEmails, subject, html });
}
