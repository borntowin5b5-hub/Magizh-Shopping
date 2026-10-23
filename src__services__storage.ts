// Data Storage & Synchronization Service for Magizh + B5 Ecosystem
import {
  User,
  Product,
  CategoryInfo,
  PromotionalBanner,
  CartItem,
  Order,
  OrderStatus,
  B5CoinAccount,
  B5Transaction,
  CoinRuleConfig,
  ManualCoinRequest,
  PartnerShop,
  PartnerLocalTransaction,
  PartnerInventoryItem,
  ReferralLevelConfig,
  ReferralRecord,
  ReferralProfile,
  Coupon,
  AuditLog,
  UserRole,
} from '../types';
import { DEFAULT_COIN_RULES } from './rewardsEngine';

// LocalStorage Keys (Local Fallback & Offline Mirror)
const KEYS = {
  CURRENT_USER: 'magizh_current_user',
  USERS: 'magizh_users',
  PRODUCTS: 'magizh_products',
  CATEGORIES: 'magizh_categories',
  BANNERS: 'magizh_banners',
  CART: 'magizh_cart',
  ORDERS: 'magizh_orders',
  COIN_ACCOUNTS: 'magizh_coin_accounts',
  COIN_TRANSACTIONS: 'magizh_coin_transactions',
  COIN_RULES: 'magizh_coin_rules',
  MANUAL_COIN_REQUESTS: 'magizh_manual_coin_requests',
  PARTNERS: 'magizh_partners',
  PARTNER_LOCAL_TXNS: 'magizh_partner_local_txns',
  REFERRAL_LEVELS: 'magizh_referral_levels',
  REFERRAL_RECORDS: 'magizh_referral_records',
  COUPONS: 'magizh_coupons',
  AUDIT_LOGS: 'magizh_audit_logs',
};

// Event Bus
type Listener = (data?: any) => void;
const listeners: Record<string, Listener[]> = {};

export function subscribe(event: string, callback: Listener): () => void {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter((cb) => cb !== callback);
  };
}

export function emit(event: string, data?: any) {
  if (listeners[event]) {
    listeners[event].forEach((cb) => cb(data));
  }
}

// Helper
function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (err) {
    return fallback;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key}:`, err);
  }
}

// Initial Seed Constants
const SEED_USERS: User[] = [
  {
    id: 'user-cust-1',
    mobile: '9876543210',
    name: 'Saravanan K',
    email: 'saravanan@magizh.in',
    role: 'customer',
    customerCode: 'MAG-CUST-84920',
    referralCode: 'MAG-REF-771',
    createdAt: '2026-01-10T09:00:00Z',
    status: 'active',
    addresses: [
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
    ],
  },
  {
    id: 'user-partner-1',
    mobile: '9843210987',
    name: 'Muthusamy R',
    email: 'kovaiorganics@magizh.in',
    role: 'partner',
    customerCode: 'MAG-PTR-101',
    referralCode: 'MAG-REF-PTR101',
    createdAt: '2026-01-15T10:00:00Z',
    status: 'active',
    addresses: [],
  },
  {
    id: 'user-sales-1',
    mobile: '9823456789',
    name: 'Anbarasan G',
    email: 'anbarasan.sales@magizh.in',
    role: 'sales',
    customerCode: 'MAG-SALES-202',
    referralCode: 'MAG-REF-LEADER',
    createdAt: '2026-01-05T08:30:00Z',
    status: 'active',
    addresses: [],
  },
  {
    id: 'user-admin-1',
    mobile: '9999999999',
    name: 'Magizh Administrator',
    email: 'admin@magizh.in',
    role: 'admin',
    customerCode: 'MAG-ADM-001',
    referralCode: 'MAG-REF-ROOT',
    createdAt: '2026-01-01T00:00:00Z',
    status: 'active',
    addresses: [],
  },
];

const SEED_CATEGORIES: CategoryInfo[] = [
  { id: 'cat-1', name: 'Traditional Millet Products', tamilName: 'பாரம்பரிய சிறுதானியங்கள்', icon: '🌾', color: 'bg-emerald-50 text-emerald-800', active: true },
  { id: 'cat-2', name: 'Podi Varieties', tamilName: 'பாரம்பரிய பொடி வகைகள்', icon: '🌶️', color: 'bg-orange-50 text-orange-800', active: true },
  { id: 'cat-3', name: 'Thokku and Pickles', tamilName: 'தொக்கு மற்றும் ஊறுகாய்', icon: '🫙', color: 'bg-amber-50 text-amber-800', active: true },
  { id: 'cat-4', name: 'Millet Snacks and Sweets', tamilName: 'சிறுதானிய தின்பண்டங்கள்', icon: '🥮', color: 'bg-yellow-50 text-yellow-800', active: true },
  { id: 'cat-5', name: 'Natural Soaps', tamilName: 'மூலிகை குளியல் சோப்புகள்', icon: '🧼', color: 'bg-teal-50 text-teal-800', active: true },
  { id: 'cat-6', name: 'Healthy Food Products', tamilName: 'ஆரோக்கிய உணவு பொருட்கள்', icon: '🍯', color: 'bg-lime-50 text-lime-800', active: true },
];

const SEED_BANNERS: PromotionalBanner[] = [
  {
    id: 'ban-1',
    title: 'Festival Harvest Feast — 2x B5 Coins',
    subtitle: 'Shop Traditional Foxtail, Kodo & Barnyard Millets with instant 50% Coin Redemption',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&q=80',
    linkUrl: '#millets',
    tag: 'HARVEST SPECIAL',
    active: true,
  },
  {
    id: 'ban-2',
    title: 'Partner Shops In-Store Pay',
    subtitle: 'Visit any approved partner shop across Tamil Nadu and redeem up to 50% using your B5 Coins',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'partner-shops',
    tag: 'LOCAL PARTNERS',
    active: true,
  },
];

const SEED_PARTNERS: PartnerShop[] = [
  {
    id: 'ptr-1',
    ownerName: 'Muthusamy R',
    shopName: 'Kovai Natural Organics & Millet Hub',
    mobile: '9843210987',
    email: 'kovaiorganics@magizh.in',
    partnerCode: 'MAG-PTR-101',
    district: 'Coimbatore',
    pinCode: '641002',
    address: 'Plot 12, West Sambandam Road, RS Puram, Coimbatore',
    status: 'approved',
    commissionRate: 8,
    specialCoinBonusMultiplier: 1.5,
    partnerRedemptionCapPercentage: 50,
    createdAt: '2026-01-15T10:00:00Z',
    totalSales: 48250,
    totalOrders: 32,
    totalCommissionPaid: 3860,
    unsettledAmount: 4200,
  },
  {
    id: 'ptr-2',
    ownerName: 'Lakshmi Narayanan',
    shopName: 'Madurai Traditional Grains & Cold Press',
    mobile: '9789012345',
    email: 'madurai.grains@magizh.in',
    partnerCode: 'MAG-PTR-102',
    district: 'Madurai',
    pinCode: '625001',
    address: '45, South Masi Street, Madurai',
    status: 'approved',
    commissionRate: 8,
    specialCoinBonusMultiplier: 1.5,
    partnerRedemptionCapPercentage: 40,
    createdAt: '2026-02-01T11:00:00Z',
    totalSales: 31400,
    totalOrders: 21,
    totalCommissionPaid: 2512,
    unsettledAmount: 3100,
  },
  {
    id: 'ptr-3',
    ownerName: 'Selvam Perumal',
    shopName: 'Salem Herbal Care & Podi Stores',
    mobile: '9654321098',
    email: 'salem.herbal@magizh.in',
    partnerCode: 'MAG-PTR-103',
    district: 'Salem',
    pinCode: '636001',
    address: '88, Bazaar Street, Salem',
    status: 'pending',
    commissionRate: 7,
    specialCoinBonusMultiplier: 1.2,
    partnerRedemptionCapPercentage: 50,
    createdAt: '2026-03-01T14:00:00Z',
    totalSales: 0,
    totalOrders: 0,
    totalCommissionPaid: 0,
    unsettledAmount: 0,
  },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Traditional Foxtail Millet Noodles (Thinai)',
    tamilName: 'பாரம்பரிய தினை நூடுல்ஸ்',
    category: 'Traditional Millet Products',
    description: '100% whole grain Foxtail Millet Noodles prepared using cold extrusion without Maida, MSG, preservatives, or artificial enhancers. Comes with natural spice taste maker.',
    benefits: ['Low Glycemic Index (Ideal for Diabetes)', 'Rich in Dietary Fiber and Iron', 'Zero Maida & Trans Fats'],
    ingredients: ['Foxtail Millet Flour', 'Whole Wheat Flour', 'Natural Rock Salt', 'Spices'],
    netWeight: '210g - 1kg',
    sku: 'MLT-FOX-01',
    barcode: '8901234500012',
    origin: 'Dharmapuri Millet Cluster, Tamil Nadu',
    images: [
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    ],
    rating: 4.8,
    reviewsCount: 142,
    status: 'active',
    isBestSeller: true,
    isTodayOffer: true,
    isPremium: false,
    variants: [
      { weight: '210g (Pack of 1)', price: 95, originalPrice: 120, stock: 45, sku: 'MLT-FOX-210' },
      { weight: '630g (Pack of 3)', price: 260, originalPrice: 360, stock: 30, sku: 'MLT-FOX-630' },
      { weight: '1kg Family Pack', price: 390, originalPrice: 520, stock: 20, sku: 'MLT-FOX-1000' },
    ],
  },
  {
    id: 'prod-2',
    name: 'Authentic Chettinad Idli Podi (Gunpowder)',
    tamilName: 'செட்டிநாடு பாரம்பரிய இட்லி பொடி',
    category: 'Podi Varieties',
    description: 'Slow-roasted lentils, Guntur red chilies, white sesame seeds, hing, and curry leaves hand-pounded to an aromatic coarse finish.',
    benefits: ['High Plant Protein', 'Traditional Stone Ground Flavor', 'No Artificial Preservatives'],
    ingredients: ['Urad Dal', 'Chana Dal', 'Guntur Red Chilli', 'White Sesame', 'Asafoetida (Hing)', 'Curry Leaves', 'Himalayan Pink Salt'],
    netWeight: '200g - 1kg',
    sku: 'POD-IDL-01',
    barcode: '8901234500029',
    origin: 'Karaikudi, Chettinad Region, Tamil Nadu',
    images: [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505253758473-96b46deae42a?auto=format&fit=crop&w=800&q=80',
    ],
    rating: 4.9,
    reviewsCount: 310,
    status: 'active',
    isBestSeller: true,
    isTodayOffer: false,
    isPremium: true,
    variants: [
      { weight: '200g', price: 140, originalPrice: 175, stock: 65, sku: 'POD-IDL-200' },
      { weight: '500g', price: 310, originalPrice: 399, stock: 40, sku: 'POD-IDL-500' },
      { weight: '1kg Bulk Jar', price: 580, originalPrice: 750, stock: 15, sku: 'POD-IDL-1000' },
    ],
  },
  {
    id: 'prod-9',
    name: 'Pure Desi Cow A2 Bilona Ghee (Cultured Butter)',
    tamilName: 'பாரம்பரிய A2 நாட்டு மாட்டு நெய்',
    category: 'Healthy Food Products',
    description: 'Golden aromatic A2 Ghee prepared using the ancient Vedic Bilona method — grass-fed Kangayam cow milk, hand-churned cultured butter.',
    benefits: ['Enhances Digestion & Gut Health', 'Vedic Churned Cultured Butter (Bilona)', 'Rich in Omega-3 and Vitamin K2'],
    ingredients: ['100% Pure Kangayam Desi Cow Milk Fat'],
    netWeight: '250ml - 1000ml',
    sku: 'GHE-A2-01',
    barcode: '8901234500098',
    origin: 'Kangayam Cattle Sanctuary, Tamil Nadu',
    images: [
      'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
    ],
    rating: 5.0,
    reviewsCount: 420,
    status: 'active',
    isBestSeller: true,
    isPremium: true,
    variants: [
      { weight: '250ml Glass Bottle', price: 420, originalPrice: 480, stock: 35, sku: 'GHE-A2-250' },
      { weight: '500ml Glass Bottle', price: 799, originalPrice: 950, stock: 25, sku: 'GHE-A2-500' },
      { weight: '1000ml (1 Litre)', price: 1550, originalPrice: 1850, stock: 12, sku: 'GHE-A2-1000' },
    ],
  },
];

export const StorageService = {
  // Current User / Session
  getCurrentUser(): User {
    const user = getStorage<User | null>(KEYS.CURRENT_USER, null);
    if (!user) {
      const defaultUser = SEED_USERS[0];
      setStorage(KEYS.CURRENT_USER, defaultUser);
      return defaultUser;
    }
    return user;
  },

  setCurrentUser(user: User): void {
    setStorage(KEYS.CURRENT_USER, user);
    emit('currentUserChanged', user);
  },

  switchRole(role: UserRole): User {
    const users = this.getUsers();
    let user = users.find((u) => u.role === role);
    if (!user) {
      user = SEED_USERS.find((u) => u.role === role) || SEED_USERS[0];
    }
    this.setCurrentUser(user);
    return user;
  },

  // Users & Auth
  getUsers(): User[] {
    return getStorage<User[]>(KEYS.USERS, SEED_USERS);
  },

  findUserByEmail(email: string): User | undefined {
    const users = this.getUsers();
    return users.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());
  },

  findUserByMobile(mobile: string): User | undefined {
    const users = this.getUsers();
    return users.find((u) => u.mobile === mobile.trim());
  },

  saveUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    setStorage(KEYS.USERS, users);
    emit('usersChanged', users);

    const current = this.getCurrentUser();
    if (current && current.id === user.id) {
      this.setCurrentUser(user);
    }
  },

  // Products
  getProducts(includeArchived: boolean = false): Product[] {
    const prods = getStorage<Product[]>(KEYS.PRODUCTS, SEED_PRODUCTS);
    if (includeArchived) return prods;
    return prods.filter((p) => p.status !== 'archived');
  },

  getProductById(id: string): Product | undefined {
    return this.getProducts(true).find((p) => p.id === id);
  },

  saveProduct(product: Product): Product {
    const products = this.getProducts(true);
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    setStorage(KEYS.PRODUCTS, products);
    emit('productsChanged', products);
    return product;
  },

  archiveOrDeleteProduct(productId: string): { action: 'archived' | 'deleted'; message: string } {
    const orders = this.getOrders();
    const isReferencedInOrders = orders.some((o) =>
      o.items.some((it) => it.productId === productId)
    );

    if (isReferencedInOrders) {
      const prods = this.getProducts(true);
      const prod = prods.find((p) => p.id === productId);
      if (prod) {
        prod.status = 'archived';
        setStorage(KEYS.PRODUCTS, prods);
        emit('productsChanged', prods);
      }
      return {
        action: 'archived',
        message: 'Product is referenced in historical orders. It has been deactivated/archived to protect order records.',
      };
    } else {
      const prods = this.getProducts(true).filter((p) => p.id !== productId);
      setStorage(KEYS.PRODUCTS, prods);
      emit('productsChanged', prods);
      return {
        action: 'deleted',
        message: 'Product had no order references and has been permanently deleted.',
      };
    }
  },

  // Categories
  getCategories(): CategoryInfo[] {
    return getStorage<CategoryInfo[]>(KEYS.CATEGORIES, SEED_CATEGORIES);
  },

  saveCategory(cat: CategoryInfo): void {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === cat.id);
    if (index >= 0) {
      categories[index] = cat;
    } else {
      categories.push(cat);
    }
    setStorage(KEYS.CATEGORIES, categories);
    emit('categoriesChanged', categories);
  },

  deleteCategory(id: string): void {
    const categories = this.getCategories().filter((c) => c.id !== id);
    setStorage(KEYS.CATEGORIES, categories);
    emit('categoriesChanged', categories);
  },

  // Promotional Banners
  getBanners(): PromotionalBanner[] {
    return getStorage<PromotionalBanner[]>(KEYS.BANNERS, SEED_BANNERS);
  },

  saveBanner(banner: PromotionalBanner): void {
    const banners = this.getBanners();
    const index = banners.findIndex((b) => b.id === banner.id);
    if (index >= 0) {
      banners[index] = banner;
    } else {
      banners.unshift(banner);
    }
    setStorage(KEYS.BANNERS, banners);
    emit('bannersChanged', banners);
  },

  deleteBanner(id: string): void {
    const banners = this.getBanners().filter((b) => b.id !== id);
    setStorage(KEYS.BANNERS, banners);
    emit('bannersChanged', banners);
  },

  // Cart
  getCart(): CartItem[] {
    return getStorage<CartItem[]>(KEYS.CART, []);
  },

  addToCart(item: CartItem): void {
    const cart = this.getCart();
    const existingIndex = cart.findIndex(
      (c) => c.productId === item.productId && c.variantWeight === item.variantWeight
    );
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += item.quantity;
    } else {
      cart.push(item);
    }
    setStorage(KEYS.CART, cart);
    emit('cartChanged', cart);
  },

  updateCartQuantity(productId: string, variantWeight: string, quantity: number): void {
    let cart = this.getCart();
    if (quantity <= 0) {
      cart = cart.filter(
        (c) => !(c.productId === productId && c.variantWeight === variantWeight)
      );
    } else {
      const item = cart.find(
        (c) => c.productId === productId && c.variantWeight === variantWeight
      );
      if (item) item.quantity = quantity;
    }
    setStorage(KEYS.CART, cart);
    emit('cartChanged', cart);
  },

  clearCart(): void {
    setStorage(KEYS.CART, []);
    emit('cartChanged', []);
  },

  // Orders
  getOrders(): Order[] {
    return getStorage<Order[]>(KEYS.ORDERS, []);
  },

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id || o.orderNumber === id);
  },

  createOrder(order: Order): void {
    const orders = this.getOrders();
    orders.unshift(order);
    setStorage(KEYS.ORDERS, orders);
    emit('ordersChanged', orders);
  },

  updateOrderStatus(orderId: string, status: OrderStatus, note: string = ''): Order | undefined {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) return undefined;

    order.orderStatus = status;
    order.updatedAt = new Date().toISOString();
    order.timeline.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Order updated to ${status}`,
    });

    setStorage(KEYS.ORDERS, orders);
    emit('ordersChanged', orders);
    return order;
  },

  // B5 Coins
  getCoinAccount(customerId: string): B5CoinAccount {
    const accounts = getStorage<B5CoinAccount[]>(KEYS.COIN_ACCOUNTS, [
      {
        customerId: 'user-cust-1',
        availableBalance: 800,
        totalEarned: 1200,
        totalRedeemed: 400,
        pendingBalance: 50,
        reversedBalance: 0,
      },
    ]);
    let account = accounts.find((a) => a.customerId === customerId);
    if (!account) {
      account = {
        customerId,
        availableBalance: 100,
        totalEarned: 100,
        totalRedeemed: 0,
        pendingBalance: 0,
        reversedBalance: 0,
      };
      accounts.push(account);
      setStorage(KEYS.COIN_ACCOUNTS, accounts);
    }
    return account;
  },

  saveCoinAccount(account: B5CoinAccount): void {
    const accounts = getStorage<B5CoinAccount[]>(KEYS.COIN_ACCOUNTS, []);
    const index = accounts.findIndex((a) => a.customerId === account.customerId);
    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    setStorage(KEYS.COIN_ACCOUNTS, accounts);
    emit('coinAccountChanged', account);
  },

  getCoinTransactions(customerId?: string): B5Transaction[] {
    const txns = getStorage<B5Transaction[]>(KEYS.COIN_TRANSACTIONS, [
      {
        id: 'TXN-SEED-01',
        customerId: 'user-cust-1',
        type: 'credit',
        amount: 800,
        reason: 'Account verification balance',
        timestamp: '2026-01-10T09:15:00Z',
        balanceAfter: 800,
        status: 'completed',
      },
    ]);
    if (!customerId) return txns;
    return txns.filter((t) => t.customerId === customerId);
  },

  recordCoinTransaction(txn: B5Transaction): void {
    const txns = getStorage<B5Transaction[]>(KEYS.COIN_TRANSACTIONS, []);
    txns.unshift(txn);
    setStorage(KEYS.COIN_TRANSACTIONS, txns);
    emit('coinTransactionsChanged', txns);
  },

  getCoinRules(): CoinRuleConfig {
    return getStorage<CoinRuleConfig>(KEYS.COIN_RULES, DEFAULT_COIN_RULES);
  },

  saveCoinRules(rules: CoinRuleConfig): void {
    setStorage(KEYS.COIN_RULES, rules);
    emit('coinRulesChanged', rules);
  },

  // Manual Coin Credit Requests
  getManualCoinRequests(): ManualCoinRequest[] {
    return getStorage<ManualCoinRequest[]>(KEYS.MANUAL_COIN_REQUESTS, [
      {
        id: 'REQ-101',
        customerId: 'user-cust-1',
        customerName: 'Saravanan K',
        customerPhone: '9876543210',
        coins: 100,
        reason: 'Festival Goodwill promotion credit',
        requestedBy: 'Store Supervisor',
        requestedAt: '2026-03-01T10:00:00Z',
        status: 'pending',
      },
    ]);
  },

  createManualCoinRequest(req: Omit<ManualCoinRequest, 'id' | 'requestedAt' | 'status'>): ManualCoinRequest {
    const requests = this.getManualCoinRequests();
    const newReq: ManualCoinRequest = {
      ...req,
      id: `REQ-${Date.now().toString().slice(-4)}`,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    requests.unshift(newReq);
    setStorage(KEYS.MANUAL_COIN_REQUESTS, requests);
    emit('manualCoinRequestsChanged', requests);
    return newReq;
  },

  resolveManualCoinRequest(requestId: string, status: 'approved' | 'rejected', adminNotes?: string): boolean {
    const requests = this.getManualCoinRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.status !== 'pending') return false;

    req.status = status;
    req.adminNotes = adminNotes;
    req.resolvedAt = new Date().toISOString();
    setStorage(KEYS.MANUAL_COIN_REQUESTS, requests);

    if (status === 'approved') {
      const account = this.getCoinAccount(req.customerId);
      const updatedBalance = account.availableBalance + req.coins;
      const updatedTotal = account.totalEarned + req.coins;

      this.saveCoinAccount({
        ...account,
        availableBalance: updatedBalance,
        totalEarned: updatedTotal,
      });

      this.recordCoinTransaction({
        id: `TXN-MANUAL-${Date.now()}`,
        customerId: req.customerId,
        type: 'manual_credit',
        amount: req.coins,
        reason: `Admin Manual Credit: ${req.reason}`,
        timestamp: new Date().toISOString(),
        balanceAfter: updatedBalance,
        status: 'completed',
      });
    }

    emit('manualCoinRequestsChanged', requests);
    return true;
  },

  // Partners & In-Store Local Transactions
  getPartners(): PartnerShop[] {
    return getStorage<PartnerShop[]>(KEYS.PARTNERS, SEED_PARTNERS);
  },

  getApprovedPartners(): PartnerShop[] {
    return this.getPartners().filter((p) => p.status === 'approved');
  },

  savePartner(partner: PartnerShop): void {
    const partners = this.getPartners();
    const index = partners.findIndex((p) => p.id === partner.id);
    if (index >= 0) {
      partners[index] = partner;
    } else {
      partners.push(partner);
    }
    setStorage(KEYS.PARTNERS, partners);
    emit('partnersChanged', partners);
  },

  updatePartnerStatus(partnerId: string, status: 'approved' | 'suspended'): void {
    const partners = this.getPartners();
    const partner = partners.find((p) => p.id === partnerId);
    if (partner) {
      partner.status = status;
      setStorage(KEYS.PARTNERS, partners);
      emit('partnersChanged', partners);
    }
  },

  getPartnerLocalTransactions(partnerId?: string): PartnerLocalTransaction[] {
    const txns = getStorage<PartnerLocalTransaction[]>(KEYS.PARTNER_LOCAL_TXNS, []);
    if (!partnerId) return txns;
    return txns.filter((t) => t.partnerId === partnerId);
  },

  processLocalPartnerTransaction(
    partnerId: string,
    customerId: string,
    eligiblePurchaseAmount: number,
    requestedCoins: number
  ): PartnerLocalTransaction {
    const partner = this.getPartners().find((p) => p.id === partnerId);
    if (!partner || partner.status !== 'approved') {
      throw new Error('Selected partner shop is not currently approved for B5 Coin redemption.');
    }

    const coinAccount = this.getCoinAccount(customerId);

    // Enforce 50% system ceiling & partner specific cap
    const systemMaxCap = Math.floor(eligiblePurchaseAmount * 0.50);
    const partnerCapPercent = Math.min(50, partner.partnerRedemptionCapPercentage || 50);
    const partnerMaxCap = Math.floor(eligiblePurchaseAmount * (partnerCapPercent / 100));
    const effectiveCap = Math.min(systemMaxCap, partnerMaxCap);

    if (requestedCoins > effectiveCap) {
      throw new Error(`Redemption exceeds cap. Maximum permitted is ${effectiveCap} B5 Coins (${partnerCapPercent}% cap).`);
    }

    if (requestedCoins > coinAccount.availableBalance) {
      throw new Error(`Insufficient coins. You requested ${requestedCoins} but have only ${coinAccount.availableBalance} available.`);
    }

    const netCashPaid = eligiblePurchaseAmount - requestedCoins;
    const commissionEarned = Math.floor(eligiblePurchaseAmount * (partner.commissionRate / 100));
    const settlementDue = eligiblePurchaseAmount - commissionEarned;
    const receiptNumber = `RCP-PTR-${Date.now().toString().slice(-6)}`;
    const txnId = `TXN-LOCAL-${Date.now()}`;

    // Deduct coins atomically
    const newBalance = coinAccount.availableBalance - requestedCoins;
    this.saveCoinAccount({
      ...coinAccount,
      availableBalance: newBalance,
      totalRedeemed: coinAccount.totalRedeemed + requestedCoins,
    });

    this.recordCoinTransaction({
      id: txnId,
      customerId,
      orderNumber: receiptNumber,
      type: 'partner_local_redemption',
      amount: requestedCoins,
      reason: `In-Store purchase at ${partner.shopName} (Receipt #${receiptNumber})`,
      timestamp: new Date().toISOString(),
      balanceAfter: newBalance,
      status: 'completed',
    });

    // Record local transaction
    const newTxn: PartnerLocalTransaction = {
      id: txnId,
      receiptNumber,
      partnerId: partner.id,
      partnerName: partner.shopName,
      customerId,
      customerName: 'Valued Customer',
      customerPhone: '',
      eligiblePurchaseAmount,
      coinsRedeemed: requestedCoins,
      netCashPaid,
      commissionRate: partner.commissionRate,
      partnerCommissionEarned: commissionEarned,
      partnerSettlementDue: settlementDue,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    const allTxns = this.getPartnerLocalTransactions();
    allTxns.unshift(newTxn);
    setStorage(KEYS.PARTNER_LOCAL_TXNS, allTxns);

    // Update partner sales and settlement ledger
    partner.totalSales += eligiblePurchaseAmount;
    partner.totalOrders += 1;
    partner.totalCommissionPaid += commissionEarned;
    partner.unsettledAmount += settlementDue;
    this.savePartner(partner);

    emit('partnerLocalTransactionsChanged', allTxns);
    return newTxn;
  },

  // Coupons
  getCoupons(): Coupon[] {
    return getStorage<Coupon[]>(KEYS.COUPONS, [
      {
        code: 'WELCOME100',
        discountType: 'fixed',
        discountValue: 100,
        minOrderValue: 500,
        description: 'Flat ₹100 Off on your traditional feast order above ₹500',
        validUntil: '2026-12-31',
        active: true,
      },
      {
        code: 'PONGAL10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderValue: 800,
        maxDiscount: 200,
        description: '10% Festive Discount on all Millet Products and Ghee',
        validUntil: '2026-12-31',
        active: true,
      },
      {
        code: 'HEALTHY50',
        discountType: 'fixed',
        discountValue: 50,
        minOrderValue: 300,
        description: '₹50 Off on healthy soaps and podi varieties',
        validUntil: '2026-12-31',
        active: true,
      },
    ]);
  },

  saveCoupon(coupon: Coupon): void {
    const coupons = this.getCoupons();
    const index = coupons.findIndex((c) => c.code === coupon.code);
    if (index >= 0) {
      coupons[index] = coupon;
    } else {
      coupons.push(coupon);
    }
    setStorage(KEYS.COUPONS, coupons);
    emit('couponsChanged', coupons);
  },

  // Referrals
  getReferralLevels(): ReferralLevelConfig[] {
    return getStorage<ReferralLevelConfig[]>(KEYS.REFERRAL_LEVELS, [
      { level: 1, title: 'Starter Promoter', minReferrals: 0, minTeamVolume: 0, rewardBonusCoins: 50, commissionPercentage: 2, badgeColor: '#10B981' },
      { level: 2, title: 'Bronze Associate', minReferrals: 6, minTeamVolume: 5000, rewardBonusCoins: 200, commissionPercentage: 3, badgeColor: '#CD7F32' },
      { level: 3, title: 'Silver Leader', minReferrals: 16, minTeamVolume: 15000, rewardBonusCoins: 500, commissionPercentage: 4, badgeColor: '#94A3B8' },
      { level: 4, title: 'Gold Director', minReferrals: 36, minTeamVolume: 40000, rewardBonusCoins: 1200, commissionPercentage: 5, badgeColor: '#F59E0B' },
      { level: 5, title: 'Platinum Champion', minReferrals: 76, minTeamVolume: 100000, rewardBonusCoins: 2500, commissionPercentage: 6, badgeColor: '#06B6D4' },
      { level: 6, title: 'Diamond Legend', minReferrals: 151, minTeamVolume: 250000, rewardBonusCoins: 5000, commissionPercentage: 7, badgeColor: '#8B5CF6' },
      { level: 7, title: 'Crown Ambassador', minReferrals: 301, minTeamVolume: 600000, rewardBonusCoins: 10000, commissionPercentage: 8, badgeColor: '#EC4899' },
    ]);
  },

  getReferralRecords(referrerId?: string): ReferralRecord[] {
    const records = getStorage<ReferralRecord[]>(KEYS.REFERRAL_RECORDS, [
      {
        id: 'ref-1',
        referrerId: 'user-cust-1',
        refereeId: 'ref-user-a',
        refereeName: 'Karthik Raja',
        refereePhone: '9443217890',
        registeredAt: '2026-02-01T10:00:00Z',
        hasPurchased: true,
        totalSpent: 1250,
        status: 'qualified',
        rewardCredited: true,
      },
      {
        id: 'ref-2',
        referrerId: 'user-cust-1',
        refereeId: 'ref-user-b',
        refereeName: 'Deepa V',
        refereePhone: '9840192837',
        registeredAt: '2026-02-14T15:30:00Z',
        hasPurchased: true,
        totalSpent: 850,
        status: 'qualified',
        rewardCredited: true,
      },
    ]);
    if (!referrerId) return records;
    return records.filter((r) => r.referrerId === referrerId);
  },

  addReferralRecord(record: ReferralRecord): void {
    const records = this.getReferralRecords();
    records.unshift(record);
    setStorage(KEYS.REFERRAL_RECORDS, records);
    emit('referralRecordsChanged', records);
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getStorage<AuditLog[]>(KEYS.AUDIT_LOGS, [
      {
        id: 'LOG-INIT',
        timestamp: '2026-01-10T09:00:00Z',
        actorRole: 'admin',
        actorName: 'System Bootstrap',
        action: 'BOOTSTRAP',
        details: 'Ecosystem initialized with 50% B5 Coin redemption ceiling rule',
      },
    ]);
  },

  logAction(role: UserRole, actorName: string, action: string, details: string): void {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorRole: role,
      actorName,
      action,
      details,
    });
    setStorage(KEYS.AUDIT_LOGS, logs.slice(0, 100));
    emit('auditLogsChanged', logs);
  },
};
