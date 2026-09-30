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
  createdAt: string;
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
export type OrderSource = 'Website' | 'Manual';

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
}

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
