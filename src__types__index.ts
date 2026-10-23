// Core Domain Types for Magizh Shopping and B5 Coin Ecosystem

export type UserRole = 'customer' | 'partner' | 'sales' | 'admin';

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine: string;
  district: string;
  pinCode: string;
  state: string;
  isDefault: boolean;
  landmark?: string;
}

export interface User {
  id: string;
  mobile: string;
  name: string;
  email: string; // Registered email address
  passwordHash?: string; // Hashed password
  role: UserRole;
  customerCode: string; // e.g. MAG-CUST-84920
  referralCode: string; // e.g. MAG-REF-771
  referredBy?: string;
  addresses: Address[];
  createdAt: string;
  status: 'active' | 'suspended';
}

export interface PasswordResetRecord {
  email: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  cooldownUntil: number;
  createdAt: string;
}

export interface WeightVariant {
  weight: string; // e.g. '250g', '500g', '1kg'
  price: number;
  originalPrice: number;
  stock: number;
  sku: string;
}

export type ProductCategory = 
  | 'Traditional Millet Products'
  | 'Podi Varieties'
  | 'Thokku and Pickles'
  | 'Millet Snacks and Sweets'
  | 'Natural Soaps'
  | 'Healthy Food Products';

export interface CategoryInfo {
  id: string;
  name: string;
  tamilName: string;
  icon: string;
  color: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  tamilName?: string;
  category: ProductCategory;
  description: string;
  benefits?: string[];
  ingredients?: string[];
  netWeight?: string;
  sku?: string;
  barcode?: string;
  origin?: string;
  images: string[]; // Up to 3 images per product
  rating: number;
  reviewsCount: number;
  variants: WeightVariant[];
  status: 'active' | 'archived'; // Archival prevents breaking historical orders
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isTodayOffer?: boolean;
  isPremium?: boolean;
  b5RewardPercentage?: number; // Configurable product-specific reward % (defaults to global rule)
  partnerShopId?: string; // If sold by a specific partner shop
}

export interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl?: string;
  tag: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

export interface CartItem {
  productId: string;
  variantWeight: string;
  quantity: number;
  price: number;
  originalPrice: number;
  name: string;
  image: string;
  category: ProductCategory;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  description: string;
  validUntil: string;
  active: boolean;
}

export type OrderStatus =
  | 'Pending Payment'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled'
  | 'Refund Pending'
  | 'Refunded';

export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Cash on Delivery';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface OrderItem {
  productId: string;
  name: string;
  variantWeight: string;
  price: number;
  quantity: number;
  total: number;
  image: string;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. MAG-2026-94817
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  shippingAddress: Address;
  merchandiseSubtotal: number;
  couponCode?: string;
  couponDiscount: number;
  eligibleMerchandiseAmount: number; // Amount eligible for B5 Coin redemption
  coinsRedeemed: number; // 1 B5 Coin = ₹1 (Max 50% of eligible merchandise)
  coinDiscountAmount: number; // Value in INR = coinsRedeemed
  deliveryCharge: number;
  taxAmount: number;
  finalPayableAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  rewardCoinsEarned: number; // Coins rewarded on completion
  rewardCoinsCredited: boolean;
  createdAt: string;
  updatedAt: string;
  timeline: OrderTimeline[];
  partnerId?: string;
}

export interface B5Transaction {
  id: string;
  customerId: string;
  orderId?: string;
  orderNumber?: string;
  type: 'credit' | 'debit' | 'reversal' | 'pending' | 'manual_credit' | 'referral_bonus' | 'partner_local_redemption';
  amount: number;
  reason: string;
  timestamp: string;
  balanceAfter: number;
  status: 'completed' | 'pending' | 'reversed';
  referenceId?: string;
}

export interface B5CoinAccount {
  customerId: string;
  availableBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  pendingBalance: number;
  reversedBalance: number;
}

export interface CoinRuleConfig {
  coinToInrRate: number; // 1 B5 Coin = ₹1
  maxRedemptionCapPercentage: number; // Default 50%
  earningPercentage: number; // Default 5% or 10%
  minQualifyingOrderAmount: number; // Min amount to earn coins
  maxRewardPerOrder: number; // Max reward coins per single order
  expiryDays: number; // Expiry in days (e.g. 365)
  referralRewardCoins: number; // Coins for successful referral qualification
  enablePartnerBonus: boolean;
}

export interface ManualCoinRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  coins: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  resolvedAt?: string;
}

export interface PartnerShop {
  id: string;
  ownerName: string;
  shopName: string;
  mobile: string;
  email: string;
  partnerCode: string; // e.g. MAG-PTR-104
  district: string;
  pinCode: string;
  address: string;
  status: 'pending' | 'approved' | 'suspended';
  commissionRate: number; // e.g. 8%
  specialCoinBonusMultiplier: number; // e.g. 1.5x
  partnerRedemptionCapPercentage: number; // Partner-specific coin redemption cap (default 50%, max 50%)
  partnerOfferStartDate?: string;
  partnerOfferEndDate?: string;
  partnerEligibilityRules?: string;
  createdAt: string;
  totalSales: number;
  totalOrders: number;
  totalCommissionPaid: number;
  unsettledAmount: number;
}

export interface PartnerLocalTransaction {
  id: string;
  receiptNumber: string; // e.g. RCP-PTR-89210
  partnerId: string;
  partnerName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  eligiblePurchaseAmount: number;
  coinsRedeemed: number; // Up to 50% system ceiling & partner cap
  netCashPaid: number;
  commissionRate: number; // e.g. 8%
  partnerCommissionEarned: number;
  partnerSettlementDue: number; // eligiblePurchaseAmount - commission
  status: 'completed' | 'cancelled' | 'reversed';
  createdAt: string;
  notes?: string;
}

export interface PartnerInventoryItem {
  id: string;
  partnerId: string;
  productId: string;
  productName: string;
  weightVariant: string;
  partnerStock: number;
  allocatedPrice: number;
  lastUpdated: string;
}

export interface ReferralLevelConfig {
  level: number; // 1 to 7
  title: string;
  minReferrals: number;
  minTeamVolume: number;
  rewardBonusCoins: number;
  commissionPercentage: number;
  badgeColor: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  refereePhone: string;
  registeredAt: string;
  hasPurchased: boolean;
  totalSpent: number;
  status: 'pending' | 'qualified';
  rewardCredited: boolean;
}

export interface ReferralProfile {
  userId: string;
  referralCode: string;
  currentLevel: number;
  totalReferrals: number;
  activeReferrals: number;
  qualifiedReferrals: number;
  totalTeamVolume: number;
  totalReferralCoinsEarned: number;
  levelUpgradeHistory: {
    level: number;
    title: string;
    unlockedAt: string;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  actorName: string;
  action: string;
  details: string;
  ipAddress?: string;
}
