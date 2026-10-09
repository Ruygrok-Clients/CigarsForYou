# CigarsForYou — Premium Cuban Cigar E-Commerce & Subscription Platform

A production-grade, full-stack e-commerce web application for **CigarsForYou**, an Australian online retailer delivering premium Cuban cigars with on-demand doorstep delivery and flexible automated subscription restock schedules.

---

## Key Features

1. **Strict 18+ Age Verification & Regulatory Compliance**
   - **Site-Entry Gate**: Full-screen modal on first visit demanding 18+ confirmation before unlocking site.
   - **Signup DOB Gate**: Registration requires Date of Birth picker; calculated age under 18 rejects registration and stores DOB securely in user's Firestore profile.
   - **Checkout Confirmation**: Mandatory checkbox confirmation of legal adult age prior to placing order.
   - **Health Warning**: Australian statutory tobacco health warnings on footer & checkout.

2. **Customer Storefront & Catalog**
   - Filter by Cuban brand (Cohiba, Partagas, Romeo y Julieta, Hoyo De Monterrey, H. Upmann, Punch, Montecristo).
   - Filter by price range, search query, and stock availability.
   - "Subscribe & Save" option with frequency dropdown (every 2, 4, 6, or 8 weeks).
   - "Notify Me When Back In Stock" email capture modal on out-of-stock items.
   - Cigarettes "Coming Soon" category launch notification signup page.

3. **Customer Account Portal (`/account`)**
   - View order history with live status updates and one-click reorder button.
   - Active subscription management: adjust delivery frequency, pause, resume, skip, or cancel.
   - Profile management and DOB audit record.

4. **Hidden Admin Portal (`/admin`)**
   - Hidden route protected by Firebase Auth & role checks (`admin` or `member`).
   - **Dashboard**: Live stats (Revenue, Orders, Active Subscriptions, Low Stock Alert Count, Pending Notifications).
   - **Orders Management**: Active vs Bin/Archived tabs, status advance workflow, order detail modal, inventory sync.
   - **Products & Stock**: Inline table stock & price editing, stock status badges, Add/Edit modal, Bulk-add tool at 0 stock.
   - **Stock Notifications**: View back-in-stock email requests, mark as notified, CSV export.
   - **Subscriptions**: Customer recurring billing cycles monitoring.
   - **Marketing**: Coupon generator (fixed AUD or %) and Cigarettes launch email list CSV export.
   - **Portal Settings** (Admin only): Staff access management (Admins vs Members).
   - **Global Features**: Screen Lock (View-Only Mode) and Light/Dark theme toggle.

---

## Tech Stack

- **Frontend**: React (Vite + TypeScript), React Router, React Query
- **Styling**: Custom CSS with espresso/leather/gold humidor design tokens
- **Backend**: Firebase Firestore, Firebase Auth, Firebase Cloud Functions v2
- **Payments**: Online checkout is temporarily unavailable. A payment processor will be added later. PayPal webhook scaffolding remains unused.
- **Iconography**: Lucide React

---

## Local Setup & Running

### 1. Install Dependencies
```bash
# Main app dependencies
npm install

# Cloud functions dependencies
cd functions && npm install && cd ..
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Firebase Project & Cloud Functions Configuration

Project ID: `cigarsforyou-ea835`

### 1. Catalogue data
Products and brand stories live in Firestore. Catalogue edits are made in the admin portal.

### 2. Configure API Keys & Secrets
Environment variables and webhooks are scaffolded in `functions/src/index.ts` and `functions/.env.example`.
Set secrets in Firebase Secret Manager:
```bash
firebase functions:secrets:set PAYPAL_CLIENT_ID
firebase functions:secrets:set PAYPAL_CLIENT_SECRET
```

### 3. Deploy Cloud Functions & Firestore Rules
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions
```

---

## Legal & Compliance Notice
> **Important**: This software implements hard 18+ age verification controls at site entry, account registration, and checkout. Given Australian tobacco retail regulations, all legal documents (Terms & Conditions, Privacy Policy, Refund Policy) provided should be reviewed by qualified legal counsel prior to public commercial deployment.
