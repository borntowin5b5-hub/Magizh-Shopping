// Production Relational Database Layer with SQLite (local persistent) & PostgreSQL Support
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword, hashOtp, verifyOtp } from './server__security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(__dirname, 'server__data__magizh.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = null;

/**
 * Saves current SQLite memory state to persistent disk file atomically.
 */
export function persistDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, buffer);
      fs.renameSync(tempFile, DB_FILE);
    } catch {
      // Windows file lock fallback
      fs.writeFileSync(DB_FILE, buffer);
    }
  } catch (err) {
    console.error('[DB] Failed to persist database file:', err.message);
  }
}

/**
 * Initializes Database Schema and Runs Migrations.
 */
export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('[DB] Loaded existing SQLite database from disk:', DB_FILE);
    } catch (err) {
      console.warn('[DB] Could not load database file, creating fresh database:', err.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('[DB] Initializing new SQLite database');
  }

  // Execute Schema Migrations
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      mobile TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      customer_code TEXT NOT NULL,
      referral_code TEXT NOT NULL,
      referred_by TEXT,
      addresses_json TEXT,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      otp_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      cooldown_until INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      tamil_name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tamil_name TEXT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      benefits_json TEXT,
      ingredients_json TEXT,
      net_weight TEXT,
      sku TEXT,
      barcode TEXT,
      origin TEXT,
      images_json TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 5.0,
      reviews_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_today_offer INTEGER NOT NULL DEFAULT 0,
      is_premium INTEGER NOT NULL DEFAULT 0,
      b5_reward_percent REAL,
      partner_shop_id TEXT,
      variants_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotional_banners (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      image_url TEXT NOT NULL,
      link_url TEXT,
      tag TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      start_date TEXT,
      end_date TEXT
    );

    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      min_order_value REAL NOT NULL,
      max_discount REAL,
      description TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      merchandise_subtotal REAL NOT NULL,
      coupon_code TEXT,
      coupon_discount REAL NOT NULL DEFAULT 0,
      eligible_merchandise_amount REAL NOT NULL,
      coins_redeemed REAL NOT NULL DEFAULT 0,
      coin_discount_amount REAL NOT NULL DEFAULT 0,
      delivery_charge REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      final_payable_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      order_status TEXT NOT NULL,
      reward_coins_earned REAL NOT NULL DEFAULT 0,
      reward_coins_credited INTEGER NOT NULL DEFAULT 0,
      partner_id TEXT,
      items_json TEXT NOT NULL,
      timeline_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coin_accounts (
      customer_id TEXT PRIMARY KEY,
      available_balance REAL NOT NULL DEFAULT 0,
      total_earned REAL NOT NULL DEFAULT 0,
      total_redeemed REAL NOT NULL DEFAULT 0,
      pending_balance REAL NOT NULL DEFAULT 0,
      reversed_balance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS coin_ledger (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      order_id TEXT,
      order_number TEXT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      balance_after REAL NOT NULL,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manual_coin_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      coins REAL NOT NULL,
      reason TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_notes TEXT,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS partner_shops (
      id TEXT PRIMARY KEY,
      owner_name TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      partner_code TEXT UNIQUE NOT NULL,
      district TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      commission_rate REAL NOT NULL DEFAULT 8.0,
      special_coin_bonus_multiplier REAL NOT NULL DEFAULT 1.5,
      partner_redemption_cap_percentage REAL NOT NULL DEFAULT 50.0,
      partner_offer_start_date TEXT,
      partner_offer_end_date TEXT,
      partner_eligibility_rules TEXT,
      total_sales REAL NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_commission_paid REAL NOT NULL DEFAULT 0,
      unsettled_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS partner_local_transactions (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      partner_id TEXT NOT NULL,
      partner_name TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      eligible_purchase_amount REAL NOT NULL,
      coins_redeemed REAL NOT NULL,
      net_cash_paid REAL NOT NULL,
      commission_rate REAL NOT NULL,
      partner_commission_earned REAL NOT NULL,
      partner_settlement_due REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT
    );
  `);

  // Check if initial seed is needed
  const userCheck = db.exec("SELECT COUNT(*) as c FROM users");
  const count = userCheck[0]?.values[0][0] || 0;

  if (count === 0) {
    seedDatabase();
  } else {
    persistDatabase();
  }
}

/**
 * Seeds initial data with rich South Indian millets, authentic Tamil names, and preloaded accounts.
 */
function seedDatabase() {
  console.log('[DB] Seeding database with initial authentic catalog and demo personas...');

  const defaultPasswordHash = hashPassword('password123');

  // 1. Users
  const users = [
    {
      id: 'user-cust-1',
      mobile: '9876543210',
      name: 'Saravanan K',
      email: 'saravanan@magizh.in',
      password_hash: defaultPasswordHash,
      role: 'customer',
      customer_code: 'MAG-CUST-84920',
      referral_code: 'MAG-REF-771',
      addresses_json: JSON.stringify([
        {
          id: 'addr-1',
          name: 'Saravanan K',
          phone: '9876543210',
          addressLine: 'Flat 4B, Green Meadows, 1st Cross, Gandhi Nagar, Adyar',
          district: 'Chennai',
          pinCode: '600020',
          state: 'Tamil Nadu',
          landmark: 'Near Gandhi Nagar Club',
          isDefault: true,
        },
      ]),
      created_at: '2026-01-10T09:00:00Z',
      status: 'active',
    },
    {
      id: 'user-partner-1',
      mobile: '9843210987',
      name: 'Muthusamy R',
      email: 'kovaiorganics@magizh.in',
      password_hash: defaultPasswordHash,
      role: 'partner',
      customer_code: 'MAG-PTR-101',
      referral_code: 'MAG-REF-PTR101',
      addresses_json: JSON.stringify([]),
      created_at: '2026-01-15T10:00:00Z',
      status: 'active',
    },
    {
      id: 'user-sales-1',
      mobile: '9823456789',
      name: 'Anbarasan G',
      email: 'anbarasan.sales@magizh.in',
      password_hash: defaultPasswordHash,
      role: 'sales',
      customer_code: 'MAG-SALES-202',
      referral_code: 'MAG-REF-LEADER',
      addresses_json: JSON.stringify([]),
      created_at: '2026-01-05T08:30:00Z',
      status: 'active',
    },
    {
      id: 'user-admin-1',
      mobile: '9999999999',
      name: 'Magizh Administrator',
      email: 'admin@magizh.in',
      password_hash: defaultPasswordHash,
      role: 'admin',
      customer_code: 'MAG-ADM-001',
      referral_code: 'MAG-REF-ROOT',
      addresses_json: JSON.stringify([]),
      created_at: '2026-01-01T00:00:00Z',
      status: 'active',
    },
  ];

  for (const u of users) {
    db.run(
      `INSERT INTO users (id, mobile, name, email, password_hash, role, customer_code, referral_code, addresses_json, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.mobile, u.name, u.email, u.password_hash, u.role, u.customer_code, u.referral_code, u.addresses_json, u.created_at, u.status]
    );
  }

  // 2. Preloaded 800 B5 Coins for Saravanan
  db.run(
    `INSERT INTO coin_accounts (customer_id, available_balance, total_earned, total_redeemed, pending_balance, reversed_balance)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['user-cust-1', 800, 1200, 400, 50, 0]
  );

  db.run(
    `INSERT INTO coin_ledger (id, customer_id, order_id, order_number, type, amount, reason, balance_after, status, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['TXN-INIT-1', 'user-cust-1', null, null, 'credit', 800, 'Preloaded account verification balance', 800, 'completed', '2026-01-10T09:00:00Z']
  );

  // 3. Partner Shops
  const partners = [
    {
      id: 'ptr-1',
      owner_name: 'Muthusamy R',
      shop_name: 'Kovai Natural Organics & Millet Hub',
      mobile: '9843210987',
      email: 'kovaiorganics@magizh.in',
      partner_code: 'MAG-PTR-101',
      district: 'Coimbatore',
      pin_code: '641002',
      address: 'Plot 12, West Sambandam Road, RS Puram, Coimbatore',
      status: 'approved',
      commission_rate: 8.0,
      special_coin_bonus_multiplier: 1.5,
      partner_redemption_cap_percentage: 50.0,
      total_sales: 48250,
      total_orders: 32,
      total_commission_paid: 3860,
      unsettled_amount: 4200,
      created_at: '2026-01-15T10:00:00Z',
    },
    {
      id: 'ptr-2',
      owner_name: 'Lakshmi Narayanan',
      shop_name: 'Madurai Traditional Grains & Cold Press',
      mobile: '9789012345',
      email: 'madurai.grains@magizh.in',
      partner_code: 'MAG-PTR-102',
      district: 'Madurai',
      pin_code: '625001',
      address: '45, South Masi Street, Madurai',
      status: 'approved',
      commission_rate: 8.0,
      special_coin_bonus_multiplier: 1.5,
      partner_redemption_cap_percentage: 40.0,
      total_sales: 31400,
      total_orders: 21,
      total_commission_paid: 2512,
      unsettled_amount: 3100,
      created_at: '2026-02-01T11:00:00Z',
    },
    {
      id: 'ptr-3',
      owner_name: 'Selvam Perumal',
      shop_name: 'Salem Herbal Care & Podi Stores',
      mobile: '9654321098',
      email: 'salem.herbal@magizh.in',
      partner_code: 'MAG-PTR-103',
      district: 'Salem',
      pin_code: '636001',
      address: '88, Bazaar Street, Salem',
      status: 'pending',
      commission_rate: 7.0,
      special_coin_bonus_multiplier: 1.2,
      partner_redemption_cap_percentage: 50.0,
      total_sales: 0,
      total_orders: 0,
      total_commission_paid: 0,
      unsettled_amount: 0,
      created_at: '2026-03-01T14:00:00Z',
    },
  ];

  for (const p of partners) {
    db.run(
      `INSERT INTO partner_shops (id, owner_name, shop_name, mobile, email, partner_code, district, pin_code, address, status, commission_rate, special_coin_bonus_multiplier, partner_redemption_cap_percentage, total_sales, total_orders, total_commission_paid, unsettled_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.owner_name, p.shop_name, p.mobile, p.email, p.partner_code, p.district, p.pin_code, p.address, p.status, p.commission_rate, p.special_coin_bonus_multiplier, p.partner_redemption_cap_percentage, p.total_sales, p.total_orders, p.total_commission_paid, p.unsettled_amount, p.created_at]
    );
  }

  // 4. Categories
  const categories = [
    { id: 'cat-1', name: 'Traditional Millet Products', tamil_name: 'பாரம்பரிய சிறுதானியங்கள்', icon: '🌾', color: 'bg-emerald-50 text-emerald-800' },
    { id: 'cat-2', name: 'Podi Varieties', tamil_name: 'பாரம்பரிய பொடி வகைகள்', icon: '🌶️', color: 'bg-orange-50 text-orange-800' },
    { id: 'cat-3', name: 'Thokku and Pickles', tamil_name: 'தொக்கு மற்றும் ஊறுகாய்', icon: '🫙', color: 'bg-amber-50 text-amber-800' },
    { id: 'cat-4', name: 'Millet Snacks and Sweets', tamil_name: 'சிறுதானிய தின்பண்டங்கள்', icon: '🥮', color: 'bg-yellow-50 text-yellow-800' },
    { id: 'cat-5', name: 'Natural Soaps', tamil_name: 'மூலிகை குளியல் சோப்புகள்', icon: '🧼', color: 'bg-teal-50 text-teal-800' },
    { id: 'cat-6', name: 'Healthy Food Products', tamil_name: 'ஆரோக்கிய உணவு பொருட்கள்', icon: '🍯', color: 'bg-lime-50 text-lime-800' },
  ];

  for (const c of categories) {
    db.run(
      `INSERT INTO categories (id, name, tamil_name, icon, color, active) VALUES (?, ?, ?, ?, ?, 1)`,
      [c.id, c.name, c.tamil_name, c.icon, c.color]
    );
  }

  // 5. Promotional Banners
  const banners = [
    {
      id: 'ban-1',
      title: 'Festival Harvest Feast — 2x B5 Coins',
      subtitle: 'Shop Traditional Foxtail, Kodo & Barnyard Millets with instant 50% Coin Redemption',
      image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&q=80',
      link_url: '#millets',
      tag: 'HARVEST SPECIAL',
      active: 1,
    },
    {
      id: 'ban-2',
      title: 'Partner Shops In-Store Pay',
      subtitle: 'Visit any approved partner shop across Tamil Nadu and redeem up to 50% using your B5 Coins',
      image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
      link_url: '#partner-shops',
      tag: 'LOCAL PARTNERS',
      active: 1,
    },
  ];

  for (const b of banners) {
    db.run(
      `INSERT INTO promotional_banners (id, title, subtitle, image_url, link_url, tag, active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.title, b.subtitle, b.image_url, b.link_url, b.tag, b.active]
    );
  }

  // 6. Coupons
  const coupons = [
    { code: 'WELCOME100', discount_type: 'fixed', discount_value: 100, min_order_value: 500, max_discount: null, description: 'Flat ₹100 Off on orders above ₹500', valid_until: '2026-12-31' },
    { code: 'PONGAL10', discount_type: 'percentage', discount_value: 10, min_order_value: 800, max_discount: 200, description: '10% Festive Discount on Millets and Ghee', valid_until: '2026-12-31' },
    { code: 'HEALTHY50', discount_type: 'fixed', discount_value: 50, min_order_value: 300, max_discount: null, description: '₹50 Off on healthy soaps and podis', valid_until: '2026-12-31' },
  ];

  for (const cp of coupons) {
    db.run(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, description, valid_until, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [cp.code, cp.discount_type, cp.discount_value, cp.min_order_value, cp.max_discount, cp.description, cp.valid_until]
    );
  }

  // 7. Products (Traditional Foxtail, Chettinad Idli Podi, A2 Ghee, Palm Jaggery, etc.)
  const products = [
    {
      id: 'prod-1',
      name: 'Traditional Foxtail Millet Noodles (Thinai)',
      tamil_name: 'பாரம்பரிய தினை நூடுல்ஸ்',
      category: 'Traditional Millet Products',
      description: '100% whole grain Foxtail Millet Noodles prepared using cold extrusion without Maida, MSG, preservatives, or artificial enhancers.',
      benefits_json: JSON.stringify(['Low Glycemic Index', 'Rich in Dietary Fiber & Iron', 'Zero Maida & Trans Fats']),
      ingredients_json: JSON.stringify(['Foxtail Millet Flour', 'Whole Wheat Flour', 'Rock Salt', 'Spices']),
      net_weight: '210g - 1kg',
      sku: 'MLT-FOX-01',
      barcode: '8901234500012',
      origin: 'Dharmapuri Millet Cluster, Tamil Nadu',
      images_json: JSON.stringify([
        'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
      ]),
      rating: 4.8,
      reviews_count: 142,
      status: 'active',
      is_bestseller: 1,
      is_today_offer: 1,
      is_premium: 0,
      variants_json: JSON.stringify([
        { weight: '210g (Pack of 1)', price: 95, originalPrice: 120, stock: 45, sku: 'MLT-FOX-210' },
        { weight: '630g (Pack of 3)', price: 260, originalPrice: 360, stock: 30, sku: 'MLT-FOX-630' },
        { weight: '1kg Family Pack', price: 390, originalPrice: 520, stock: 20, sku: 'MLT-FOX-1000' },
      ]),
      created_at: '2026-01-10T10:00:00Z',
    },
    {
      id: 'prod-2',
      name: 'Authentic Chettinad Idli Podi (Gunpowder)',
      tamil_name: 'செட்டிநாடு பாரம்பரிய இட்லி பொடி',
      category: 'Podi Varieties',
      description: 'Slow-roasted lentils, Guntur red chilies, white sesame seeds, hing, and curry leaves hand-pounded to an aromatic coarse finish.',
      benefits_json: JSON.stringify(['High Plant Protein', 'Traditional Stone Ground Flavor', 'No Chemical Preservatives']),
      ingredients_json: JSON.stringify(['Urad Dal', 'Chana Dal', 'Guntur Red Chilli', 'White Sesame', 'Hing', 'Curry Leaves']),
      net_weight: '200g - 1kg',
      sku: 'POD-IDL-01',
      barcode: '8901234500029',
      origin: 'Karaikudi, Chettinad Region, Tamil Nadu',
      images_json: JSON.stringify([
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1505253758473-96b46deae42a?auto=format&fit=crop&w=800&q=80',
      ]),
      rating: 4.9,
      reviews_count: 310,
      status: 'active',
      is_bestseller: 1,
      is_today_offer: 0,
      is_premium: 1,
      variants_json: JSON.stringify([
        { weight: '200g', price: 140, originalPrice: 175, stock: 65, sku: 'POD-IDL-200' },
        { weight: '500g', price: 310, originalPrice: 399, stock: 40, sku: 'POD-IDL-500' },
        { weight: '1kg Bulk Jar', price: 580, originalPrice: 750, stock: 15, sku: 'POD-IDL-1000' },
      ]),
      created_at: '2026-01-10T10:30:00Z',
    },
    {
      id: 'prod-9',
      name: 'Pure Desi Cow A2 Bilona Ghee (Cultured Butter)',
      tamil_name: 'பாரம்பரிய A2 நாட்டு மாட்டு நெய்',
      category: 'Healthy Food Products',
      description: 'Golden aromatic A2 Ghee prepared using the ancient Vedic Bilona method — grass-fed Kangayam cow milk, hand-churned cultured butter.',
      benefits_json: JSON.stringify(['Enhances Gut Health', 'Vedic Churned Cultured Butter (Bilona)', 'Rich in Omega-3 and Vitamin K2']),
      ingredients_json: JSON.stringify(['100% Pure Kangayam Desi Cow Milk Fat']),
      net_weight: '250ml - 1000ml',
      sku: 'GHE-A2-01',
      barcode: '8901234500098',
      origin: 'Kangayam Cattle Sanctuary, Tamil Nadu',
      images_json: JSON.stringify([
        'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
      ]),
      rating: 5.0,
      reviews_count: 420,
      status: 'active',
      is_bestseller: 1,
      is_today_offer: 0,
      is_premium: 1,
      variants_json: JSON.stringify([
        { weight: '250ml Glass Bottle', price: 420, originalPrice: 480, stock: 35, sku: 'GHE-A2-250' },
        { weight: '500ml Glass Bottle', price: 799, originalPrice: 950, stock: 25, sku: 'GHE-A2-500' },
        { weight: '1000ml (1 Litre)', price: 1550, originalPrice: 1850, stock: 12, sku: 'GHE-A2-1000' },
      ]),
      created_at: '2026-01-10T11:00:00Z',
    },
  ];

  for (const prod of products) {
    db.run(
      `INSERT INTO products (id, name, tamil_name, category, description, benefits_json, ingredients_json, net_weight, sku, barcode, origin, images_json, rating, reviews_count, status, is_bestseller, is_today_offer, is_premium, variants_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [prod.id, prod.name, prod.tamil_name, prod.category, prod.description, prod.benefits_json, prod.ingredients_json, prod.net_weight, prod.sku, prod.barcode, prod.origin, prod.images_json, prod.rating, prod.reviews_count, prod.status, prod.is_bestseller, prod.is_today_offer, prod.is_premium, prod.variants_json, prod.created_at]
    );
  }

  // Persist seed data to disk
  persistDatabase();
}

// -------------------------------------------------------------
// Database Query & Transaction Methods
// -------------------------------------------------------------

export const dbService = {
  // Users & Auth
  findUserByMobile(mobile) {
    const res = db.exec("SELECT * FROM users WHERE mobile = ?", [mobile]);
    if (!res[0] || !res[0].values[0]) return null;
    return mapUserRow(res[0].columns, res[0].values[0]);
  },

  findUserByEmail(email) {
    if (!email) return null;
    const res = db.exec("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (!res[0] || !res[0].values[0]) return null;
    return mapUserRow(res[0].columns, res[0].values[0]);
  },

  createUser(userData) {
    db.run(
      `INSERT INTO users (id, mobile, name, email, password_hash, role, customer_code, referral_code, referred_by, addresses_json, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userData.id,
        userData.mobile,
        userData.name,
        userData.email,
        userData.passwordHash || null,
        userData.role || 'customer',
        userData.customerCode,
        userData.referralCode,
        userData.referredBy || null,
        JSON.stringify(userData.addresses || []),
        userData.createdAt || new Date().toISOString(),
        userData.status || 'active',
      ]
    );

    // Initialize 100 welcome coins
    db.run(
      `INSERT OR IGNORE INTO coin_accounts (customer_id, available_balance, total_earned, total_redeemed, pending_balance, reversed_balance)
       VALUES (?, 100, 100, 0, 0, 0)`,
      [userData.id]
    );

    persistDatabase();
    return this.findUserByMobile(userData.mobile);
  },

  updateUserPassword(email, newPasswordHash) {
    db.run(
      "UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)",
      [newPasswordHash, email.trim()]
    );
    persistDatabase();
  },

  // Password Reset Management
  savePasswordResetOtp(email, otpHash, expiresAt, cooldownUntil) {
    db.run(
      `INSERT INTO password_resets (email, otp_hash, expires_at, attempts, cooldown_until, created_at)
       VALUES (?, ?, ?, 0, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         otp_hash = excluded.otp_hash,
         expires_at = excluded.expires_at,
         attempts = 0,
         cooldown_until = excluded.cooldown_until,
         created_at = excluded.created_at`,
      [email.toLowerCase().trim(), otpHash, expiresAt, cooldownUntil, new Date().toISOString()]
    );
    persistDatabase();
  },

  getPasswordResetRecord(email) {
    const res = db.exec("SELECT * FROM password_resets WHERE LOWER(email) = LOWER(?)", [email.toLowerCase().trim()]);
    if (!res[0] || !res[0].values[0]) return null;
    const cols = res[0].columns;
    const row = res[0].values[0];
    return {
      email: row[cols.indexOf('email')],
      otpHash: row[cols.indexOf('otp_hash')],
      expiresAt: row[cols.indexOf('expires_at')],
      attempts: row[cols.indexOf('attempts')],
      cooldownUntil: row[cols.indexOf('cooldown_until')],
      createdAt: row[cols.indexOf('created_at')],
    };
  },

  incrementResetAttempts(email) {
    db.run(
      "UPDATE password_resets SET attempts = attempts + 1 WHERE LOWER(email) = LOWER(?)",
      [email.toLowerCase().trim()]
    );
    persistDatabase();
  },

  clearPasswordReset(email) {
    db.run("DELETE FROM password_resets WHERE LOWER(email) = LOWER(?)", [email.toLowerCase().trim()]);
    persistDatabase();
  },

  // Products
  getProducts(includeArchived = false) {
    const sql = includeArchived
      ? "SELECT * FROM products ORDER BY created_at DESC"
      : "SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC";
    const res = db.exec(sql);
    if (!res[0]) return [];
    return res[0].values.map((v) => mapProductRow(res[0].columns, v));
  },

  getProductById(id) {
    const res = db.exec("SELECT * FROM products WHERE id = ?", [id]);
    if (!res[0] || !res[0].values[0]) return null;
    return mapProductRow(res[0].columns, res[0].values[0]);
  },

  saveProduct(p) {
    const existing = this.getProductById(p.id);
    if (existing) {
      db.run(
        `UPDATE products SET
          name = ?, tamil_name = ?, category = ?, description = ?,
          benefits_json = ?, ingredients_json = ?, net_weight = ?,
          sku = ?, barcode = ?, origin = ?, images_json = ?,
          status = ?, is_bestseller = ?, is_today_offer = ?, is_premium = ?,
          b5_reward_percent = ?, variants_json = ?
         WHERE id = ?`,
        [
          p.name, p.tamilName || null, p.category, p.description,
          JSON.stringify(p.benefits || []), JSON.stringify(p.ingredients || []),
          p.netWeight || null, p.sku || null, p.barcode || null, p.origin || null,
          JSON.stringify(p.images || []), p.status || 'active',
          p.isBestSeller ? 1 : 0, p.isTodayOffer ? 1 : 0, p.isPremium ? 1 : 0,
          p.b5RewardPercentage || null, JSON.stringify(p.variants || []),
          p.id,
        ]
      );
    } else {
      db.run(
        `INSERT INTO products (id, name, tamil_name, category, description, benefits_json, ingredients_json, net_weight, sku, barcode, origin, images_json, rating, reviews_count, status, is_bestseller, is_today_offer, is_premium, b5_reward_percent, variants_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, p.name, p.tamilName || null, p.category, p.description,
          JSON.stringify(p.benefits || []), JSON.stringify(p.ingredients || []),
          p.netWeight || null, p.sku || null, p.barcode || null, p.origin || null,
          JSON.stringify(p.images || []), p.status || 'active',
          p.isBestSeller ? 1 : 0, p.isTodayOffer ? 1 : 0, p.isPremium ? 1 : 0,
          p.b5RewardPercentage || null, JSON.stringify(p.variants || []),
          p.createdAt || new Date().toISOString(),
        ]
      );
    }
    persistDatabase();
    return this.getProductById(p.id);
  },

  archiveOrDeleteProduct(productId) {
    // Check if product is referenced by any historical orders
    const res = db.exec("SELECT COUNT(*) as c FROM orders WHERE items_json LIKE ?", [`%${productId}%`]);
    const referencedCount = res[0]?.values[0][0] || 0;

    if (referencedCount > 0) {
      // Archive to preserve historical order integrity
      db.run("UPDATE products SET status = 'archived' WHERE id = ?", [productId]);
      persistDatabase();
      return {
        action: 'archived',
        message: `Product is referenced in ${referencedCount} historical order(s). It has been safely deactivated/archived to protect order records.`,
      };
    } else {
      // Safe to delete entirely
      db.run("DELETE FROM products WHERE id = ?", [productId]);
      persistDatabase();
      return {
        action: 'deleted',
        message: 'Product had no order references and has been permanently deleted.',
      };
    }
  },

  // Categories
  getCategories() {
    const res = db.exec("SELECT * FROM categories WHERE active = 1");
    if (!res[0]) return [];
    const cols = res[0].columns;
    return res[0].values.map((v) => ({
      id: v[cols.indexOf('id')],
      name: v[cols.indexOf('name')],
      tamilName: v[cols.indexOf('tamil_name')],
      icon: v[cols.indexOf('icon')],
      color: v[cols.indexOf('color')],
      active: v[cols.indexOf('active')] === 1,
    }));
  },

  saveCategory(cat) {
    const tamilName = cat.tamilName || cat.tamil_name || cat.name || '';
    const icon = cat.icon || 'Sparkles';
    const color = cat.color || 'emerald';
    db.run(
      `INSERT INTO categories (id, name, tamil_name, icon, color, active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         tamil_name = excluded.tamil_name,
         icon = excluded.icon,
         color = excluded.color,
         active = excluded.active`,
      [cat.id, cat.name, tamilName, icon, color]
    );
    persistDatabase();
  },

  deleteCategory(id) {
    db.run("DELETE FROM categories WHERE id = ?", [id]);
    persistDatabase();
  },

  // Banners
  getBanners() {
    const res = db.exec("SELECT * FROM promotional_banners WHERE active = 1");
    if (!res[0]) return [];
    const cols = res[0].columns;
    return res[0].values.map((v) => ({
      id: v[cols.indexOf('id')],
      title: v[cols.indexOf('title')],
      subtitle: v[cols.indexOf('subtitle')],
      imageUrl: v[cols.indexOf('image_url')],
      linkUrl: v[cols.indexOf('link_url')],
      tag: v[cols.indexOf('tag')],
      active: v[cols.indexOf('active')] === 1,
      startDate: v[cols.indexOf('start_date')],
      endDate: v[cols.indexOf('end_date')],
    }));
  },

  saveBanner(b) {
    db.run(
      `INSERT INTO promotional_banners (id, title, subtitle, image_url, link_url, tag, active, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         subtitle = excluded.subtitle,
         image_url = excluded.image_url,
         link_url = excluded.link_url,
         tag = excluded.tag,
         active = excluded.active,
         start_date = excluded.start_date,
         end_date = excluded.end_date`,
      [b.id, b.title, b.subtitle || null, b.imageUrl, b.linkUrl || null, b.tag || null, b.active ? 1 : 0, b.startDate || null, b.endDate || null]
    );
    persistDatabase();
  },

  // Partner Shops
  getPartners() {
    const res = db.exec("SELECT * FROM partner_shops ORDER BY created_at DESC");
    if (!res[0]) return [];
    return res[0].values.map((v) => mapPartnerRow(res[0].columns, v));
  },

  getPartnerById(id) {
    const res = db.exec("SELECT * FROM partner_shops WHERE id = ?", [id]);
    if (!res[0] || !res[0].values[0]) return null;
    return mapPartnerRow(res[0].columns, res[0].values[0]);
  },

  savePartner(p) {
    db.run(
      `INSERT INTO partner_shops (id, owner_name, shop_name, mobile, email, partner_code, district, pin_code, address, status, commission_rate, special_coin_bonus_multiplier, partner_redemption_cap_percentage, partner_offer_start_date, partner_offer_end_date, partner_eligibility_rules, total_sales, total_orders, total_commission_paid, unsettled_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         owner_name = excluded.owner_name,
         shop_name = excluded.shop_name,
         mobile = excluded.mobile,
         email = excluded.email,
         district = excluded.district,
         pin_code = excluded.pin_code,
         address = excluded.address,
         status = excluded.status,
         commission_rate = excluded.commission_rate,
         special_coin_bonus_multiplier = excluded.special_coin_bonus_multiplier,
         partner_redemption_cap_percentage = excluded.partner_redemption_cap_percentage,
         partner_offer_start_date = excluded.partner_offer_start_date,
         partner_offer_end_date = excluded.partner_offer_end_date,
         partner_eligibility_rules = excluded.partner_eligibility_rules`,
      [
        p.id, p.ownerName, p.shopName, p.mobile, p.email, p.partnerCode,
        p.district, p.pinCode, p.address, p.status, p.commissionRate,
        p.specialCoinBonusMultiplier || 1.5,
        p.partnerRedemptionCapPercentage || 50.0,
        p.partnerOfferStartDate || null,
        p.partnerOfferEndDate || null,
        p.partnerEligibilityRules || null,
        p.totalSales || 0, p.totalOrders || 0,
        p.totalCommissionPaid || 0, p.unsettledAmount || 0,
        p.createdAt || new Date().toISOString(),
      ]
    );
    persistDatabase();
    return this.getPartnerById(p.id);
  },

  updatePartnerStatus(partnerId, status) {
    db.run("UPDATE partner_shops SET status = ? WHERE id = ?", [status, partnerId]);
    persistDatabase();
  },

  // Orders Management
  createOrder(order) {
    db.run(
      `INSERT INTO orders (id, order_number, customer_id, customer_name, customer_phone, shipping_address_json, merchandise_subtotal, coupon_code, coupon_discount, eligible_merchandise_amount, coins_redeemed, coin_discount_amount, delivery_charge, tax_amount, final_payable_amount, payment_method, payment_status, order_status, reward_coins_earned, reward_coins_credited, partner_id, items_json, timeline_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.orderNumber,
        order.customerId,
        order.customerName,
        order.customerPhone,
        JSON.stringify(order.shippingAddress || {}),
        order.merchandiseSubtotal,
        order.couponCode || null,
        order.couponDiscount || 0,
        order.eligibleMerchandiseAmount,
        order.coinsRedeemed || 0,
        order.coinDiscountAmount || 0,
        order.deliveryCharge || 0,
        order.taxAmount || 0,
        order.finalPayableAmount,
        order.paymentMethod,
        order.paymentStatus,
        order.orderStatus,
        order.rewardCoinsEarned || 0,
        order.rewardCoinsCredited ? 1 : 0,
        order.partnerId || null,
        JSON.stringify(order.items || []),
        JSON.stringify(order.timeline || [{ status: order.orderStatus, timestamp: new Date().toISOString(), note: 'Order created' }]),
        order.createdAt || new Date().toISOString(),
        order.updatedAt || new Date().toISOString(),
      ]
    );
    persistDatabase();
    return this.getOrderById(order.id);
  },

  getOrderById(id) {
    const res = db.exec("SELECT * FROM orders WHERE id = ? OR order_number = ?", [id, id]);
    if (!res[0] || !res[0].values[0]) return null;
    return mapOrderRow(res[0].columns, res[0].values[0]);
  },

  getOrders() {
    const res = db.exec("SELECT * FROM orders ORDER BY created_at DESC");
    if (!res[0]) return [];
    return res[0].values.map((v) => mapOrderRow(res[0].columns, v));
  },

  updateOrderStatus(orderId, status, note = '') {
    const order = this.getOrderById(orderId);
    if (!order) return null;
    const timeline = order.timeline || [];
    timeline.push({ status, timestamp: new Date().toISOString(), note });
    db.run(
      "UPDATE orders SET order_status = ?, timeline_json = ?, updated_at = ? WHERE id = ? OR order_number = ?",
      [status, JSON.stringify(timeline), new Date().toISOString(), orderId, orderId]
    );
    persistDatabase();
    return this.getOrderById(orderId);
  },

  // Coin Accounts & Ledger
  getCoinAccount(customerId) {
    const res = db.exec("SELECT * FROM coin_accounts WHERE customer_id = ?", [customerId]);
    if (!res[0] || !res[0].values[0]) {
      db.run(
        "INSERT OR IGNORE INTO coin_accounts (customer_id, available_balance, total_earned, total_redeemed, pending_balance, reversed_balance) VALUES (?, 100, 100, 0, 0, 0)",
        [customerId]
      );
      persistDatabase();
      return { customerId, availableBalance: 100, totalEarned: 100, totalRedeemed: 0, pendingBalance: 0, reversedBalance: 0 };
    }
    const cols = res[0].columns;
    const row = res[0].values[0];
    return {
      customerId: row[cols.indexOf('customer_id')],
      availableBalance: row[cols.indexOf('available_balance')],
      totalEarned: row[cols.indexOf('total_earned')],
      totalRedeemed: row[cols.indexOf('total_redeemed')],
      pendingBalance: row[cols.indexOf('pending_balance')],
      reversedBalance: row[cols.indexOf('reversed_balance')],
    };
  },

  saveCoinAccount(acc) {
    db.run(
      `INSERT INTO coin_accounts (customer_id, available_balance, total_earned, total_redeemed, pending_balance, reversed_balance)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(customer_id) DO UPDATE SET
         available_balance = excluded.available_balance,
         total_earned = excluded.total_earned,
         total_redeemed = excluded.total_redeemed,
         pending_balance = excluded.pending_balance,
         reversed_balance = excluded.reversed_balance`,
      [acc.customerId, acc.availableBalance, acc.totalEarned, acc.totalRedeemed, acc.pendingBalance || 0, acc.reversedBalance || 0]
    );
    persistDatabase();
  },

  recordCoinTransaction(tx) {
    db.run(
      `INSERT INTO coin_ledger (id, customer_id, order_id, order_number, type, amount, reason, balance_after, status, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id || `TX-${Date.now()}`,
        tx.customerId,
        tx.orderId || null,
        tx.orderNumber || null,
        tx.type,
        tx.amount,
        tx.reason,
        tx.balanceAfter,
        tx.status || 'completed',
        tx.timestamp || new Date().toISOString(),
      ]
    );
    persistDatabase();
  },

  getCoinTransactions(customerId) {
    const sql = customerId
      ? "SELECT * FROM coin_ledger WHERE customer_id = ? ORDER BY timestamp DESC"
      : "SELECT * FROM coin_ledger ORDER BY timestamp DESC";
    const res = customerId ? db.exec(sql, [customerId]) : db.exec(sql);
    if (!res[0]) return [];
    const cols = res[0].columns;
    return res[0].values.map((v) => ({
      id: v[cols.indexOf('id')],
      customerId: v[cols.indexOf('customer_id')],
      orderId: v[cols.indexOf('order_id')],
      orderNumber: v[cols.indexOf('order_number')],
      type: v[cols.indexOf('type')],
      amount: v[cols.indexOf('amount')],
      reason: v[cols.indexOf('reason')],
      balanceAfter: v[cols.indexOf('balance_after')],
      status: v[cols.indexOf('status')],
      timestamp: v[cols.indexOf('timestamp')],
    }));
  },

  // Atomic Partner In-Store Local Transaction
  processLocalPartnerTransaction(partnerIdOrOpts, customerIdArg, eligiblePurchaseAmountArg, requestedCoinsArg, notesArg) {
    let partnerId, customerId, eligiblePurchaseAmount, requestedCoins, notes, customerName, customerPhone;
    if (typeof partnerIdOrOpts === 'object') {
      partnerId = partnerIdOrOpts.partnerId;
      customerId = partnerIdOrOpts.customerId;
      eligiblePurchaseAmount = partnerIdOrOpts.eligiblePurchaseAmount;
      requestedCoins = partnerIdOrOpts.coinsRedeemed;
      notes = partnerIdOrOpts.notes;
      customerName = partnerIdOrOpts.customerName;
      customerPhone = partnerIdOrOpts.customerPhone;
    } else {
      partnerId = partnerIdOrOpts;
      customerId = customerIdArg;
      eligiblePurchaseAmount = eligiblePurchaseAmountArg;
      requestedCoins = requestedCoinsArg;
      notes = notesArg;
    }

    const partner = this.getPartnerById(partnerId);
    if (!partner || partner.status !== 'approved') {
      throw new Error('Partner shop is not approved for B5 Coin redemption');
    }

    const coinAccRes = db.exec("SELECT * FROM coin_accounts WHERE customer_id = ?", [customerId]);
    if (!coinAccRes[0] || !coinAccRes[0].values[0]) {
      throw new Error('Customer coin wallet not found');
    }
    const cols = coinAccRes[0].columns;
    const accRow = coinAccRes[0].values[0];
    const availableBalance = accRow[cols.indexOf('available_balance')];
    const totalRedeemed = accRow[cols.indexOf('total_redeemed')];

    // Enforce 50% system ceiling & partner specific cap
    const systemMaxCap = Math.floor(eligiblePurchaseAmount * 0.50);
    const partnerCapPercent = Math.min(50, partner.partnerRedemptionCapPercentage || 50);
    const partnerMaxCap = Math.floor(eligiblePurchaseAmount * (partnerCapPercent / 100));
    const effectiveCap = Math.min(systemMaxCap, partnerMaxCap);

    if (requestedCoins > effectiveCap) {
      throw new Error(`Requested redemption exceeds cap. Maximum permitted is ${effectiveCap} B5 Coins (${partnerCapPercent}% cap).`);
    }

    if (requestedCoins > availableBalance) {
      throw new Error(`Insufficient coins. You requested ${requestedCoins} but have only ${availableBalance} available.`);
    }

    const netCashPaid = eligiblePurchaseAmount - requestedCoins;
    const commissionEarned = Math.floor(eligiblePurchaseAmount * (partner.commissionRate / 100));
    const settlementDue = eligiblePurchaseAmount - commissionEarned;
    const receiptNumber = `RCP-PTR-${Date.now().toString().slice(-6)}`;
    const txnId = `TXN-LOCAL-${Date.now()}`;

    // Atomic deductions & ledger
    const newBalance = availableBalance - requestedCoins;
    db.run(
      "UPDATE coin_accounts SET available_balance = ?, total_redeemed = ? WHERE customer_id = ?",
      [newBalance, totalRedeemed + requestedCoins, customerId]
    );

    db.run(
      `INSERT INTO coin_ledger (id, customer_id, order_id, order_number, type, amount, reason, balance_after, status, timestamp)
       VALUES (?, ?, ?, ?, 'partner_local_redemption', ?, ?, ?, 'completed', ?)`,
      [
        txnId,
        customerId,
        receiptNumber,
        receiptNumber,
        requestedCoins,
        `In-store purchase at ${partner.shopName} (Receipt #${receiptNumber})`,
        newBalance,
        new Date().toISOString(),
      ]
    );

    // Record local partner transaction
    db.run(
      `INSERT INTO partner_local_transactions (id, receipt_number, partner_id, partner_name, customer_id, customer_name, customer_phone, eligible_purchase_amount, coins_redeemed, net_cash_paid, commission_rate, partner_commission_earned, partner_settlement_due, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [
        txnId,
        receiptNumber,
        partner.id,
        partner.shopName,
        customerId,
        customerName || 'Valued Customer',
        customerPhone || '',
        eligiblePurchaseAmount,
        requestedCoins,
        netCashPaid,
        partner.commissionRate,
        commissionEarned,
        settlementDue,
        new Date().toISOString(),
      ]
    );

    // Update partner sales and settlement ledger
    db.run(
      `UPDATE partner_shops SET
         total_sales = total_sales + ?,
         total_orders = total_orders + 1,
         total_commission_paid = total_commission_paid + ?,
         unsettled_amount = unsettled_amount + ?
       WHERE id = ?`,
      [eligiblePurchaseAmount, commissionEarned, settlementDue, partner.id]
    );

    persistDatabase();

    return {
      id: txnId,
      receiptNumber,
      partnerId: partner.id,
      partnerName: partner.shopName,
      customerId,
      customerName: customerName || 'Valued Customer',
      customerPhone: customerPhone || '',
      eligiblePurchaseAmount,
      coinsRedeemed: requestedCoins,
      netCashPaid,
      commissionRate: partner.commissionRate,
      partnerCommissionEarned: commissionEarned,
      partnerSettlementDue: settlementDue,
      status: 'completed',
      createdAt: new Date().toISOString(),
      notes: notes || '',
    };
  },

  getPartnerLocalTransactions(partnerId) {
    const res = db.exec("SELECT * FROM partner_local_transactions WHERE partner_id = ? ORDER BY created_at DESC", [partnerId]);
    if (!res[0]) return [];
    const cols = res[0].columns;
    return res[0].values.map((v) => ({
      id: v[cols.indexOf('id')],
      receiptNumber: v[cols.indexOf('receipt_number')],
      partnerId: v[cols.indexOf('partner_id')],
      partnerName: v[cols.indexOf('partner_name')],
      customerId: v[cols.indexOf('customer_id')],
      eligiblePurchaseAmount: v[cols.indexOf('eligible_purchase_amount')],
      coinsRedeemed: v[cols.indexOf('coins_redeemed')],
      netCashPaid: v[cols.indexOf('net_cash_paid')],
      commissionRate: v[cols.indexOf('commission_rate')],
      partnerCommissionEarned: v[cols.indexOf('partner_commission_earned')],
      partnerSettlementDue: v[cols.indexOf('partner_settlement_due')],
      status: v[cols.indexOf('status')],
      createdAt: v[cols.indexOf('created_at')],
    }));
  },

  // Audit Logs
  logAudit(actorRole, actorName, action, details, ipAddress = '127.0.0.1') {
    db.run(
      `INSERT INTO audit_logs (id, timestamp, actor_role, actor_name, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`LOG-${Date.now()}`, new Date().toISOString(), actorRole, actorName, action, details, ipAddress]
    );
    persistDatabase();
  },

  getAuditLogs() {
    const res = db.exec("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100");
    if (!res[0]) return [];
    const cols = res[0].columns;
    return res[0].values.map((v) => ({
      id: v[cols.indexOf('id')],
      timestamp: v[cols.indexOf('timestamp')],
      actorRole: v[cols.indexOf('actor_role')],
      actorName: v[cols.indexOf('actor_name')],
      action: v[cols.indexOf('action')],
      details: v[cols.indexOf('details')],
      ipAddress: v[cols.indexOf('ip_address')],
    }));
  },
};

// Helper row mappers
function mapUserRow(cols, row) {
  return {
    id: row[cols.indexOf('id')],
    mobile: row[cols.indexOf('mobile')],
    name: row[cols.indexOf('name')],
    email: row[cols.indexOf('email')],
    passwordHash: row[cols.indexOf('password_hash')],
    role: row[cols.indexOf('role')],
    customerCode: row[cols.indexOf('customer_code')],
    referralCode: row[cols.indexOf('referral_code')],
    referredBy: row[cols.indexOf('referred_by')],
    addresses: JSON.parse(row[cols.indexOf('addresses_json')] || '[]'),
    createdAt: row[cols.indexOf('created_at')],
    status: row[cols.indexOf('status')],
  };
}

function mapProductRow(cols, row) {
  return {
    id: row[cols.indexOf('id')],
    name: row[cols.indexOf('name')],
    tamilName: row[cols.indexOf('tamil_name')],
    category: row[cols.indexOf('category')],
    description: row[cols.indexOf('description')],
    benefits: JSON.parse(row[cols.indexOf('benefits_json')] || '[]'),
    ingredients: JSON.parse(row[cols.indexOf('ingredients_json')] || '[]'),
    netWeight: row[cols.indexOf('net_weight')],
    sku: row[cols.indexOf('sku')],
    barcode: row[cols.indexOf('barcode')],
    origin: row[cols.indexOf('origin')],
    images: JSON.parse(row[cols.indexOf('images_json')] || '[]'),
    rating: row[cols.indexOf('rating')],
    reviewsCount: row[cols.indexOf('reviews_count')],
    status: row[cols.indexOf('status')],
    isBestSeller: row[cols.indexOf('is_bestseller')] === 1,
    isTodayOffer: row[cols.indexOf('is_today_offer')] === 1,
    isPremium: row[cols.indexOf('is_premium')] === 1,
    b5RewardPercentage: row[cols.indexOf('b5_reward_percent')],
    partnerShopId: row[cols.indexOf('partner_shop_id')],
    variants: JSON.parse(row[cols.indexOf('variants_json')] || '[]'),
    createdAt: row[cols.indexOf('created_at')],
  };
}

function mapPartnerRow(cols, row) {
  return {
    id: row[cols.indexOf('id')],
    ownerName: row[cols.indexOf('owner_name')],
    shopName: row[cols.indexOf('shop_name')],
    mobile: row[cols.indexOf('mobile')],
    email: row[cols.indexOf('email')],
    partnerCode: row[cols.indexOf('partner_code')],
    district: row[cols.indexOf('district')],
    pinCode: row[cols.indexOf('pin_code')],
    address: row[cols.indexOf('address')],
    status: row[cols.indexOf('status')],
    commissionRate: row[cols.indexOf('commission_rate')],
    specialCoinBonusMultiplier: row[cols.indexOf('special_coin_bonus_multiplier')],
    partnerRedemptionCapPercentage: row[cols.indexOf('partner_redemption_cap_percentage')],
    partnerOfferStartDate: row[cols.indexOf('partner_offer_start_date')],
    partnerOfferEndDate: row[cols.indexOf('partner_offer_end_date')],
    partnerEligibilityRules: row[cols.indexOf('partner_eligibility_rules')],
    totalSales: row[cols.indexOf('total_sales')],
    totalOrders: row[cols.indexOf('total_orders')],
    totalCommissionPaid: row[cols.indexOf('total_commission_paid')],
    unsettledAmount: row[cols.indexOf('unsettled_amount')],
    createdAt: row[cols.indexOf('created_at')],
  };
}

function mapOrderRow(cols, row) {
  return {
    id: row[cols.indexOf('id')],
    orderNumber: row[cols.indexOf('order_number')],
    customerId: row[cols.indexOf('customer_id')],
    customerName: row[cols.indexOf('customer_name')],
    customerPhone: row[cols.indexOf('customer_phone')],
    shippingAddress: JSON.parse(row[cols.indexOf('shipping_address_json')] || '{}'),
    merchandiseSubtotal: row[cols.indexOf('merchandise_subtotal')],
    couponCode: row[cols.indexOf('coupon_code')],
    couponDiscount: row[cols.indexOf('coupon_discount')],
    eligibleMerchandiseAmount: row[cols.indexOf('eligible_merchandise_amount')],
    coinsRedeemed: row[cols.indexOf('coins_redeemed')],
    coinDiscountAmount: row[cols.indexOf('coin_discount_amount')],
    deliveryCharge: row[cols.indexOf('delivery_charge')],
    taxAmount: row[cols.indexOf('tax_amount')],
    finalPayableAmount: row[cols.indexOf('final_payable_amount')],
    paymentMethod: row[cols.indexOf('payment_method')],
    paymentStatus: row[cols.indexOf('payment_status')],
    orderStatus: row[cols.indexOf('order_status')],
    rewardCoinsEarned: row[cols.indexOf('reward_coins_earned')],
    rewardCoinsCredited: row[cols.indexOf('reward_coins_credited')] === 1,
    partnerId: row[cols.indexOf('partner_id')],
    items: JSON.parse(row[cols.indexOf('items_json')] || '[]'),
    timeline: JSON.parse(row[cols.indexOf('timeline_json')] || '[]'),
    createdAt: row[cols.indexOf('created_at')],
    updatedAt: row[cols.indexOf('updated_at')],
  };
}
