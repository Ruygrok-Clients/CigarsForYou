export type UserRole = 'customer' | 'admin' | 'member';

export interface Address {
  id: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  isDefault?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  dateOfBirth?: string; // YYYY-MM-DD format
  role: UserRole;
  address?: Address;
  addresses?: Address[];
  phone?: string;
  rewardsProgramInterest?: boolean;
  rewardsProgramVotedAt?: string;
  /** True balance. May go negative after a clawback. Spendable points are max(0, this). */
  rewardsPoints?: number;
  /** Absent means Bronze. Written only by Cloud Functions. */
  loyaltyTier?: LoyaltyTier;
  /** Points earned from purchases in the rolling 30-day window. Written only by Cloud Functions. */
  loyaltyWindowPoints?: number;
  loyaltyTierUpdatedAt?: string;
  createdAt: string;
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface TierPointsCost {
  bronze: number;
  silver: number;
  gold: number;
}

export interface RewardsSettings {
  silverThreshold: number;
  goldThreshold: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ProductSpecification {
  vitola?: string;
  factoryName?: string;
  ringGauge?: number;
  length?: string;
  strength?: string;
  wrapper?: string;
  filler?: string;
  binder?: string;
  smokingTime?: string;
}

export interface PackagingOption {
  id: string;
  name: string; // e.g. "Single Stick", "Box of 10", "Cabinet of 25"
  priceMultiplier: number; // e.g. 1, 9.5, 23.5
  stock: number;
}

export interface Product {
  id?: string;
  name: string;
  brand: string;
  slug: string;
  price: number; // AUD
  currency: 'AUD';
  stock: number;
  imageUrl: string;
  category: 'cigars' | 'cigarettes';
  origin: string; // e.g. 'Cuban'
  active: boolean;
  description?: string;
  extendedDescription?: string;
  brandHistory?: string;
  tagline?: string;
  tastingNotes?: string[];
  specifications?: ProductSpecification;
  packagingOptions?: PackagingOption[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DeliveryMethod = 'immediate' | 'express';

export type OrderStatus = 'Pending' | 'Verified' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type OrderSource = 'Website' | 'Manual' | 'Reward';

export interface RewardProduct {
  id?: string;
  name: string;
  description?: string;
  imageUrl: string;
  /** Minimum tier that can see and redeem this reward. Missing means Bronze. */
  minTier?: LoyaltyTier;
  /** Point price charged for each tier. Missing costs fall back to pointsCost. */
  pointsCostByTier?: Partial<TierPointsCost>;
  /** Legacy single price. Kept in sync with the Bronze cost when saved from admin. */
  pointsCost?: number;
  stock: number;
  active: boolean;
  createdAt: string;
}

export interface RewardCartItem {
  product: RewardProduct;
  quantity: number;
}

export interface RewardCheckoutDraft {
  name: string;
  email: string;
  phone: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  ageConfirmed: boolean;
}

export type RewardsLedgerReason = 'earn' | 'redeem' | 'clawback' | 'redeem_refund';

export interface RewardsLedgerEntry {
  id?: string;
  userId: string;
  orderId?: string;
  delta: number;
  reason: RewardsLedgerReason;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  pointsCost?: number;
  /** True when a cancel restored this line's stock. */
  stockRestored?: boolean;
}

export type RefundMethod = 'manual' | 'processor';

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  updatedBy?: string;
}

export interface Order {
  id?: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee?: number;
  deliveryMethod?: DeliveryMethod;
  couponCode?: string;
  totalAmount: number;
  currency: 'AUD';
  status: OrderStatus;
  source: OrderSource;
  paymentMethod: 'PayPal' | 'Pending' | 'Other';
  deliveryAddress: Address;
  ageConfirmed: boolean;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  /** How a recorded refund was issued. Always `manual` until a processor is connected. */
  refundMethod?: RefundMethod;
  /** Amount recorded as refunded. Defaults to the order total when an admin records a refund. */
  refundAmount?: number;
  /** Points granted for this paid order. Absent until earn has been processed. */
  pointsEarned?: number;
  pointsClawedBack?: boolean;
  /** Points spent on a reward redemption. */
  pointsSpent?: number;
  /** True after a cancelled reward order has had its points returned. */
  pointsRefunded?: boolean;
  statusHistory: OrderStatusHistory[];
  archived?: boolean;
}

export interface StockNotification {
  id?: string;
  userId?: string;
  productId: string;
  productName: string;
  productBrand: string;
  email: string;
  requestedAt: string;
  notified: boolean;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  amount: number;
  active: boolean;
  timesClaimed: number;
  minOrderAmount?: number;
  minSpend?: number;
  expiresAt?: string;
  usageLimit?: number;
  usedCount?: number;
}

export interface EmailSubscriber {
  id?: string;
  email: string;
  source: 'cigarettes-coming-soon';
  subscribedAt: string;
}

export interface PortalStats {
  totalOrders: number;
  totalProducts: number;
  lowStockProductsCount: number;
  pendingNotificationsCount: number;
  totalRevenue: number;
}
