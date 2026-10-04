export type UserRole = 'customer' | 'admin' | 'member' | 'marketing';

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
  /** Written only by Cloud Functions after a Didit approval. */
  ageVerified?: boolean;
  ageVerificationStatus?: string;
  diditSessionId?: string;
  ageVerifiedAt?: string;
  /** Set by the legacy grandfather migration for pre-Didit accounts. */
  ageVerificationSource?: string;
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

/** Quantity-based bulk pricing for cigars and cigarettes. Accessories do not use this. */
export interface BulkDiscountTier {
  id: string;
  minQuantity: number;
  /** Multiplier applied to the product's base unit price. 1 = no discount, 0.95 = 5% off. */
  unitPriceMultiplier: number;
}

export type ProductRange = 'cigars' | 'cigarettes' | 'accessories';

export interface CatalogCategory {
  id?: string;
  range: ProductRange;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface BrandStory {
  id?: string;
  name: string;
  title: string;
  factory: string;
  origin: string;
  founded: string;
  description: string;
  highlights: string[];
}

export interface Product {
  id?: string;
  name: string;
  brand: string;
  /** Managed category for this product's range. `brand` mirrors the category name. */
  catalogCategoryId?: string;
  slug: string;
  price: number; // AUD
  currency: 'AUD';
  stock: number;
  imageUrl: string;
  category: ProductRange;
  /** Accessory only. Ranges where this product may appear in Frequently Bought Together. */
  fbtRanges?: ProductRange[];
  /** Set by the monthly sales job. Featured accessories are more likely to be picked within their category. */
  fbtFeatured?: boolean;
  /** Percent number only. The storefront renders “Based on our data {n}% of customers…”. */
  fbtStat?: number;
  /** Up to three companion product ids shown as Frequently Bought Together. */
  fbtCompanionIds?: string[];
  /** Fallback pool used when order data cannot fill all three companion slots. */
  fbtDefaultIds?: string[];
  origin: string; // e.g. 'Cuban'
  active: boolean;
  shortDescription?: string;
  /** Required when saving from the admin portal. */
  extendedDescription?: string;
  /** Optional link into the brandStories collection. */
  brandStoryId?: string;
  brandStoryName?: string;
  tastingNotes?: string[];
  specifications?: ProductSpecification;
  /** Cigars and cigarettes only. Accessories must not use bulk tiers. */
  bulkDiscountTiers?: BulkDiscountTier[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DeliveryMethod = 'immediate' | 'express';

export type OrderStatus = 'Pending' | 'Verified' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type OrderSource = 'Website' | 'Manual' | 'Reward';

export interface NewsPost {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  /** Blank-line paragraphs. A block starting with "## " renders as a heading. */
  body: string;
  publishedAt: string;
  readMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export type ImmediateDispatchResolution = 'pending_customer' | 'full_refund' | 'express_upgrade';

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  updatedBy?: string;
  note?: string;
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
  diditSessionId?: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  /** How a recorded refund was issued. Always `manual` until a processor is connected. */
  refundMethod?: RefundMethod;
  /** Amount recorded as refunded. Defaults to the order total when an admin records a refund. */
  refundAmount?: number;
  /** Set when Immediate Dispatch cannot be fulfilled and the customer is notified. */
  immediateDispatchUnavailableAt?: string;
  /** Customer choice is recorded by staff after they reply or call. */
  immediateDispatchResolution?: ImmediateDispatchResolution;
  immediateDispatchResolutionAt?: string;
  /** Immediate Dispatch fee recorded as refunded when the order is moved to complimentary Express. */
  immediateDispatchFeeRefunded?: number;
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
  source: 'cigars-coming-soon' | 'cigarettes-coming-soon' | 'accessories-coming-soon';
  subscribedAt: string;
}

export interface Enquiry {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'reviewed';
}

export interface B2BEnquiry {
  id?: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  abn?: string;
  interest: 'Wholesale' | 'Venue stocking' | 'Licensed retail' | 'Other';
  message: string;
  createdAt: string;
  status: 'new' | 'reviewed';
}

export interface OperationalSystemFile {
  id: string;
  /** Name shown in the portal. Defaults to the PDF filename and can be changed. */
  displayName: string;
  originalFileName: string;
  storagePath: string;
  uploadedAt: string;
}

export interface OperationalSystem {
  id?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  files: OperationalSystemFile[];
}

export interface PortalStats {
  totalOrders: number;
  totalProducts: number;
  lowStockProductsCount: number;
  pendingNotificationsCount: number;
  totalRevenue: number;
}
