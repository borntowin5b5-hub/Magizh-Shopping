# Magizh Shopping + B5 Coin Commerce Ecosystem

A complete, full-stack, mobile-first commerce platform engineered for **Magizh Shopping** (authentic South Indian millets, stone-pounded podis, cold-pressed oils, thokku, snacks, and herbal products) and **B5 Coin** (loyalty reward & in-store counter redemption currency).

---

## 🎨 Brand Identity & Design System

- **Primary Colors**:
  - Forest Green (`#166534`, `rgb(22, 101, 52)`)
  - Dark Terracotta Orange (`#C2410C`, `rgb(194, 65, 12)`)
- **Supporting Accents**:
  - Warm Cream (`#FDFBF7`, `#F5EBE1`)
  - Crisp White (`#FFFFFF`)
  - Dark Brown (`#2D1810`)
- **Layout**: Mobile-first responsive layout, 2-column mobile product cards, touch-optimized bottom navigation, desktop command bar.

---

## 👥 4 Role-Based Operational Dashboards

The ecosystem enforces strict role separation and permission guards:

1. **Customer App**:
   - Product catalog with Tamil/English names, ingredients, net weight, weight/quantity variant selectors.
   - Promotional banners (Festival harvest specials, Flash deals with live countdown timers).
   - Online shopping cart, discount coupons, and 3-step checkout.
   - B5 Coin Wallet: live balance, transaction history, earning timeline, expiry tracking.
   - Local Partner Shops directory with in-store redemption calculator.
   - Customer account profile with registered email, customer code, and delivery address book.
   - Real email password recovery with time-limited OTP (with developer demo fallback banner).

2. **Partner Shop Dashboard**:
   - Store profile with unique partner code (`MAG-PTR-101`), location, and contracted commission rate.
   - **In-Store B5 Counter POS**: Walk-in billing tool enforcing the 50% redemption ceiling, instant atomic wallet deduction, and verified receipt generation (`RCP-PTR-XXXXXX`).
   - Order fulfillment pipeline with status transitions (`Confirmed` → `Processing` → `Packed` → `Shipped` → `Delivered`).
   - Assigned store inventory and live stock levels.
   - Automated settlement and commission payout reports.

3. **Sales & Referral Leadership Hub**:
   - 7-tier qualification and progression engine (Levels 1 to 7).
   - Direct team member roster, personal purchase tracking, and multi-tier volume goals.
   - Commission accounting, monthly payout calculator, and invite code sharing.

4. **Master Administrator Hub**:
   - Full product management: Add, view, edit, activate/deactivate, and safe removal.
   - Image manager supporting up to 3 image uploads/previews per product with replacement and deletion.
   - Historical integrity protection: Products referenced in historical orders are safely archived/deactivated, while unreferenced products are cleanly deleted.
   - Category CMS (dynamic CRUD reflecting immediately on store filters).
   - Promotional banner CMS (dynamic card management reflecting on the home carousel).
   - Global B5 Coin rule configuration (base reward %, max redemption cap %, expiry days).
   - Dual-administrator approval queue for manual coin credits.
   - Audit trail recording administrative actions with actor names, timestamps, and IP addresses.
   - Integrated 20-Point automated specification test runner.

---

## 🪙 B5 Coin Rewards Engine & 50% Redemption Rule

- **Valuation**: `1 B5 Coin = ₹1 INR` redemption value.
- **Mandatory Ceiling**: A customer can use B5 Coins to pay for a **maximum of 50%** of the eligible order amount.
  - *Example*: On a ₹1,000 order, even if a customer has 800 B5 Coins, the maximum allowable redemption is **500 B5 Coins** (giving ₹500 discount, with ₹500 paid via UPI/Card/COD).
- **In-Store Partner Cap**: Partner shops can also configure custom local caps (e.g., 40%), and the system automatically enforces `min(50% system ceiling, partner cap, customer balance)`.
- **Double-Entry Ledger**: Every coin earning, redemption, reversal, or manual credit creates an immutable ledger entry with balance verification.
- **Order Cancellation Reversal**: Cancelling an order automatically restores all redeemed coins back to the customer's wallet.

---

## 🔒 Security Architecture

- **Password Hashing**: Node.js `node:crypto` `scrypt` hashing with unique cryptographic salt per user (`salt:key` format) and timing-safe comparisons.
- **Password Reset OTP**: Cryptographically secure 6-digit OTPs hashed with HMAC-SHA256, 10-minute expiry, 60-second resend cooldown, and 5-attempt brute-force protection.
- **Timing-Safe Responses**: Forgot password endpoints return identical safe messages regardless of whether the email exists, preventing user enumeration.
- **Dual Email Delivery**:
  - When SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) are configured, OTPs are dispatched via real email delivery.
  - When unconfigured in local development, the platform displays a clearly labeled `[DEMO MODE] Time-Limited Password Reset OTP` banner. Mock emails are never misrepresented as real deliveries.

---

## 💾 Relational Database Engine

The backend includes a zero-configuration WebAssembly SQLite database engine (`sql.js`) that persists to `server/data/magizh.sqlite`, plus native PostgreSQL support via `pg` when `DATABASE_URL` is set on Render:

- `users`: User personas, credentials, customer codes, and address books.
- `password_resets`: Time-limited OTP hashes, expiration timestamps, attempt counters, and cooldowns.
- `products`: Product catalog with weight variants, SKU, barcode, status (`active` / `archived`), and image URLs.
- `categories`: Dynamic category definitions.
- `promotional_banners`: Promotional campaigns and festival offers.
- `orders`: Complete multi-line orders with JSON items, fulfillment timeline, and coin accounting.
- `coin_accounts`: Double-entry wallet accounts.
- `coin_ledger`: Auditable transaction log.
- `partner_shops`: Approved partner shops and commission rates.
- `partner_local_transactions`: In-store counter receipts with cash paid and commission earned.
- `coupons`: Stackable discount vouchers.
- `referral_levels`: Configuration for Levels 1 through 7.
- `referrals`: Multi-tier referral trees.
- `audit_logs`: Security and administrative activity audit trail.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js v18+ (tested on Node v20.18.0)
- npm v9+

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` (optional for local testing; default SQLite and mock OTP banner activate automatically):
```bash
cp .env.example .env
```

### 4. Running the Application Locally
To start the backend API and database:
```bash
npm run server
```
In a separate terminal, to start the mobile-first Vite development frontend:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running the 20-Point Automated Specification Test Suite
To execute the comprehensive specification test runner covering Section G requirements:
```bash
node test-suite-full.js
```

---

## 🧪 Specification Verification Summary (20/20 Passed)

| # | Requirement | Status | Assertion Details |
|---|---|---|---|
| 1 | Customer registration with email, mobile, password | ✅ PASSED | Scrypt password hashing with unique salt |
| 2 | Duplicate email rejection | ✅ PASSED | Duplicate email detection prevents conflicting accounts |
| 3 | Customer login with mobile and password | ✅ PASSED | Timing-safe credential comparison |
| 4 | Forgot password request generating time-limited OTP | ✅ PASSED | 6-digit OTP with 10-minute expiry and HMAC hash |
| 5 | Password reset OTP verification and cooldown | ✅ PASSED | 60-second resend cooldown & 5-attempt limit |
| 6 | Admin product creation (3 images, variants, SKU, barcode) | ✅ PASSED | Up to 3 images, weight variants, barcode, 8% B5 reward |
| 7 | Admin product edit & immediate catalog sync | ✅ PASSED | Instant update reflected across queries and subscriptions |
| 8 | Product archival when referenced in orders | ✅ PASSED | Protects historical invoice references via `status='archived'` |
| 9 | Permanent deletion allowed when unreferenced | ✅ PASSED | Unreferenced orphan products deleted cleanly |
| 10 | Category creation, editing, and deletion in CMS | ✅ PASSED | Real-time category CMS with live customer app reflection |
| 11 | Promotional banner creation and home reflection | ✅ PASSED | Banner CMS reflected in hero and promo carousel |
| 12 | 50% B5 Coin redemption ceiling enforcement ($1 = ₹1) | ✅ PASSED | ₹1,000 order → strictly max 500 B5 Coins |
| 13 | Partner in-store B5 transaction honoring 50% cap | ✅ PASSED | In-store billing respects 50% ceiling & partner cap |
| 14 | Unique in-store receipt generation (`RCP-PTR-XXXXXX`) | ✅ PASSED | Receipts itemize bill, coin discount, cash paid, commission |
| 15 | Atomic coin balance deduction and ledger record | ✅ PASSED | Atomic deduction with double-entry ledger balance check |
| 16 | Unauthorized role route protection | ✅ PASSED | Role guards block customer from Partner and Admin hubs |
| 17 | Partner order status progression | ✅ PASSED | Confirmed → Processing → Packed → Shipped → Delivered |
| 18 | Order cancellation reversing coin redemption | ✅ PASSED | Redeemed coins reversed back to customer wallet |
| 19 | Low stock warning indicator on products with stock ≤ 10 | ✅ PASSED | Live inventory warnings flagged in Admin & Partner views |
| 20 | SQLite database persistence with relational tables | ✅ PASSED | 14 tables verified in disk file `server/data/magizh.sqlite` |

---

## 📦 Production Deployment (Render)

Refer to [`RENDER_DEPLOYMENT.md`](./RENDER_DEPLOYMENT.md) for step-by-step instructions on deploying the full-stack service to Render with automated builds, environment variables, and persistent data storage.
