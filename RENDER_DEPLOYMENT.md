# Render Deployment Guide: Magizh Shopping + B5 Coin Ecosystem

This guide details how to deploy the unified full-stack Magizh Shopping + B5 Coin commerce platform to [Render](https://render.com) as a single Web Service.

---

## 🏗️ Architecture on Render

- **Static Frontend**: Built via Vite (`npm run build`) into `dist/`.
- **Node.js Server**: Serves the REST API (`/api/*`) on port `$PORT` and serves static frontend assets (`dist/`) for all frontend routes.
- **Database Options**:
  1. **SQLite with Persistent Disk (Recommended for Single-Instance)**: Mount a Render Persistent Disk at `/app/server/data` (mount path: `server/data`) so `magizh.sqlite` persists across deployments.
  2. **Render PostgreSQL**: Create a Render PostgreSQL database and set `DATABASE_URL` to its external connection string.

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Push Code to GitHub / GitLab
Ensure all files (excluding `node_modules` and `.env`) are committed to your Git repository:
```bash
git init
git add .
git commit -m "Magizh Shopping + B5 Coin Complete Ecosystem - Production Ready"
git remote add origin https://github.com/your-username/magizh-b5-ecosystem.git
git push -u origin main
```

### Step 2: Create a New Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your Git repository containing the Magizh Shopping project.
4. Fill in the deployment settings:
   - **Name**: `magizh-shopping-b5` (or your preferred name)
   - **Region**: Singapore / Frankfurt / Oregon (choose closest to your audience)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
     *(or `node server/server.js`)*

### Step 3: Configure Environment Variables
Under the **Environment** tab on Render, add the following key-value pairs:

| Key | Recommended Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations |
| `CORS_ORIGIN` | `*` | Or your production domain |
| `SMTP_HOST` | `smtp.gmail.com` | Or SendGrid/Mailgun/SES host |
| `SMTP_PORT` | `587` | Standard TLS SMTP port |
| `SMTP_USER` | `support@magizh.in` | Sender mailbox username |
| `SMTP_PASS` | `your_smtp_app_password` | App-specific password |
| `EMAIL_FROM` | `Magizh Shopping <support@magizh.in>` | From header for OTP emails |
| `DATABASE_URL` | *(Optional)* | Only if using Render PostgreSQL |

> [!NOTE]
> If SMTP credentials are left blank, the platform automatically activates the clearly labeled **[DEMO MODE] Time-Limited Password Reset OTP** banner on screen for safe developer testing without crashing.

### Step 4: Add Persistent Disk (For SQLite Database)
If you are using SQLite:
1. In your Web Service settings on Render, navigate to **Disks**.
2. Click **Add Disks**.
3. Set **Name**: `magizh-db-data`.
4. Set **Mount Path**: `server/data`.
5. Set **Size**: `1 GB` (Standard).
6. Save changes. Render will persist `server/data/magizh.sqlite` across service restarts and redeployments.

### Step 5: Verify Deployment Health
Once the deployment finishes:
1. Check the health endpoint: `https://your-service-name.onrender.com/api/health`
   - Expect: `{"status":"healthy","service":"Magizh Shopping & B5 Coin Ecosystem Backend","database":"connected","version":"1.0.0"}`
2. Verify all four dedicated routes directly in the browser (supports direct URL navigation and browser refresh):
   - **Customer Storefront (`/`)**: 2-column mobile layout, product catalog, cart, checkout with 50% B5 Coin cap.
   - **Partner Portal (`/partner`)**: Franchise Partner Shop login and in-store QR/PIN redemption dashboard.
   - **Referral Leader Hub (`/referral`)**: Multi-level team genealogy and sales earnings dashboard.
   - **Admin Management Portal (`/admin`)**: Protected by server-side bearer token authentication (`admin@magizh.com` / `admin123`) for product catalog CRUD, categories, banners, and audit logs.
3. Verify server-side security:
   - Direct API calls to mutate catalog (`POST /api/products`, `PUT /api/products/:id`) without an admin token are rejected with HTTP 401/403.
   - Ordinary customers and partner accounts cannot access the admin management portal or administrative API endpoints.
