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
  addresses?: Address[];
  phone?: string;
  createdAt: string;
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
}

export interface CartItem {
  product: Product;
  quantity: number;
  isSubscription?: boolean;
  frequencyWeeks?: 2 | 4 | 6 | 8;
}

export type OrderStatus = 'Pending' | 'Verified' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type OrderSource = 'Website' | 'Subscription-generated' | 'Manual';

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  isSubscription?: boolean;
  frequencyWeeks?: number;
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
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  currency: 'AUD';
  status: OrderStatus;
  source: OrderSource;
  paymentMethod: 'Stripe' | 'PayPal' | 'Test Card';
  deliveryAddress: Address;
  ageConfirmed: boolean;
  isSubscriptionOrder?: boolean;
  subscriptionId?: string;
  createdAt: string;
  statusHistory: OrderStatusHistory[];
  archived?: boolean;
}

export interface Subscription {
  id?: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  productId: string;
  productName: string;
  productBrand: string;
  quantity: number;
  pricePerDelivery: number;
  frequencyWeeks: 2 | 4 | 6 | 8;
  status: 'active' | 'paused' | 'cancelled';
  stripeSubscriptionId?: string;
  paypalSubscriptionId?: string;
  nextBillingDate: string;
  createdAt: string;
  deliveryAddress: Address;
}

export interface StockNotification {
  id?: string;
  productId: string;
  productName: string;
  productBrand: string;
  email: string;
  requestedAt: string;
  notified: boolean;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  amount: number;
  active: boolean;
  timesClaimed: number;
  minOrderAmount?: number;
}

export interface EmailSubscriber {
  id?: string;
  email: string;
  source: 'cigarettes-coming-soon';
  subscribedAt: string;
}

export interface PortalStats {
  totalOrders: number;
  activeSubscriptions: number;
  totalProducts: number;
  lowStockProductsCount: number;
  pendingNotificationsCount: number;
  totalRevenue: number;
}
