import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import { AdminAccountGate } from '../components/AdminAccountGate';
import { RewardsProgramPanel } from '../components/RewardsProgramPanel';
import type { Coupon, Order, OrderItem, StockNotification, Product, Address } from '../types';
import { deliveryMethodLabel } from '../constants/deliveryCopy';
import { formatHubAddressLine, getDistributionHub } from '../constants/distributionHubs';
import { CopyIconButton } from '../components/CopyIconButton';
import {
  formatCouponCodesLabel,
  orderShippingListFee,
  partitionOrderCoupons,
  shippingOfferCodesForOrder,
  type CouponTypeMap
} from '../utils/orderCoupons';
import { normalizeLoyaltyTier, spendablePoints, tierLabel, TIER_COLORS } from '../utils/rewards';
import { 
  User as UserIcon, 
  Package, 
  LogOut, 
  ShieldCheck,
  ShoppingBag,
  MapPin,
  Bell,
  Award,
  Check,
  Trash2,
  ExternalLink,
  ShoppingCart,
  Edit2,
  X,
  Plus,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type AccountTab = 'account' | 'loyalty' | 'orders' | 'notify' | 'special';

function accountTabFromQuery(value: string | null): AccountTab | null {
  if (value === 'profile') return 'account';
  if (value === 'rewards') return 'loyalty';
  if (value === 'account' || value === 'loyalty' || value === 'orders' || value === 'notify' || value === 'special') return value;
  return null;
}

function money(amount: number): string {
  return `$${amount.toFixed(2)} AUD`;
}

function pickupAddressLine(order: Order): string {
  const hub = getDistributionHub(order.pickupHubId);
  if (hub) return formatHubAddressLine(hub);
  const address = order.deliveryAddress;
  return [address?.street, address?.suburb, address?.state, address?.postcode].filter(Boolean).join(', ');
}

const OrderLine: React.FC<{ item: OrderItem; reward: boolean; last: boolean }> = ({ item, reward, last }) => {
  const line = item.price * item.quantity;
  const list = item.listUnitPrice;
  const discounted = typeof list === 'number' && list > item.price + 0.001;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.55rem 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)', fontSize: '0.9rem' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)' }}>{item.brand} {item.name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
          Qty {item.quantity}
          {reward
            ? ` · ${item.pointsCost ?? 0} pts each`
            : ` · ${money(item.price)} each`}
          {discounted && (
            <>
              {' · '}
              <span style={{ textDecoration: 'line-through' }}>{money(list)}</span>
              {typeof item.discountPercent === 'number' && item.discountPercent > 0 ? ` · ${item.discountPercent}% qty discount` : ' · quantity discount'}
            </>
          )}
        </div>
      </div>
      <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
        {reward ? `${(item.pointsCost ?? 0) * item.quantity} pts` : money(line)}
      </span>
    </div>
  );
};

const OrderFulfilment: React.FC<{ order: Order }> = ({ order }) => {
  const pickup = order.deliveryMethod === 'pickup';
  const address = pickup ? pickupAddressLine(order) : '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
      <div style={{ color: 'var(--text-secondary)' }}>
        {deliveryMethodLabel(order.deliveryMethod)}
      </div>
      {pickup && address && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span style={{ color: 'var(--text-primary)', lineHeight: 1.45 }}>{address}</span>
          <CopyIconButton label="address" value={address} />
        </div>
      )}
      {pickup && (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.45 }}>
          {order.status === 'Collectable'
            ? 'Ready to collect, 7:00am to 7:00pm. Bring photo ID. You cannot browse stock at the hub.'
            : 'We email you when this order is ready to collect. You cannot browse stock at the hub.'}
        </p>
      )}
      {order.trackingNumber && (
        <div style={{ color: 'var(--text-secondary)' }}>
          {order.trackingCarrier ? `${order.trackingCarrier}: ` : 'Tracking: '}
          {order.trackingUrl ? (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)' }}>{order.trackingNumber}</a>
          ) : order.trackingNumber}
        </div>
      )}
    </div>
  );
};

const OrderTotals: React.FC<{ order: Order; couponTypes?: CouponTypeMap }> = ({ order, couponTypes }) => {
  if (order.source === 'Reward') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Points spent</span>
          <span style={{ color: 'var(--accent-gold)', fontSize: '1.15rem' }}>{order.pointsSpent ?? 0} pts</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <span>Due for delivery</span>
          <span>{money(order.shippingFee ?? order.totalAmount)}</span>
        </div>
      </div>
    );
  }

  const { itemCodes, shippingCodes } = partitionOrderCoupons(order, couponTypes);
  const shippingOfferCodes = shippingOfferCodesForOrder(order, couponTypes);
  const shippingFee = order.shippingFee ?? 0;
  const methodLabel = deliveryMethodLabel(order.deliveryMethod);
  // Prefer codes that actually waived Immediate Dispatch; fall back to any free-shipping codes on a $0 delivery.
  const waiverCodes = shippingOfferCodes.length > 0 ? shippingOfferCodes : (shippingFee === 0 ? shippingCodes : []);
  // Split like Subtotal + Discount: list price on the method line, green Free on the offer line.
  const showShippingWaiver = shippingFee === 0 && order.deliveryMethod !== 'pickup';
  const listFee = showShippingWaiver ? orderShippingListFee(order) : null;
  const waiverLabel = waiverCodes.length > 0
    ? `Discount (${formatCouponCodesLabel(waiverCodes)})`
    : order.immediateDispatchResolution === 'express_upgrade'
      ? 'Complimentary Express'
      : 'Free shipping';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
        <span>Subtotal</span>
        <span>{money(order.subtotal)}</span>
      </div>
      {(order.discountAmount ?? 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
          <span>Discount{itemCodes.length > 0 ? ` (${formatCouponCodesLabel(itemCodes)})` : ''}</span>
          <span>-{money(order.discountAmount)}</span>
        </div>
      )}
      {showShippingWaiver ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>{methodLabel}</span>
            <span>{listFee != null ? money(listFee) : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
            <span>{waiverLabel}</span>
            <span>Free</span>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>{methodLabel}</span>
          <span style={{ color: shippingFee === 0 ? '#4caf50' : undefined }}>
            {shippingFee === 0 ? 'Free' : money(shippingFee)}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Total paid</span>
        <span style={{ color: 'var(--accent-gold)', fontSize: '1.15rem' }}>{money(order.totalAmount)}</span>
      </div>
    </div>
  );
};

export const AccountPage: React.FC = () => {
  const { currentUser, userProfile, loading: authLoading, logOut, updateUserProfile, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = accountTabFromQuery(searchParams.get('tab')) ?? 'account';

  const chooseTab = (tab: AccountTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'loyalty') next.delete('panel');
    navigate({ pathname: '/account', search: next.toString() }, { replace: true });
  };

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);

  const updateTabsScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) {
      setCanScrollTabsLeft(false);
      setCanScrollTabsRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollTabsLeft(el.scrollLeft > 2);
    setCanScrollTabsRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2);
  }, []);

  const scrollAccountTabs = (direction: -1 | 1) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const amount = Math.max(160, Math.round(el.clientWidth * 0.55));
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAdmin || !userProfile) return;
    const el = tabsScrollRef.current;
    if (!el) return;
    updateTabsScrollState();
    el.addEventListener('scroll', updateTabsScrollState, { passive: true });
    window.addEventListener('resize', updateTabsScrollState);
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateTabsScrollState())
      : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateTabsScrollState);
      window.removeEventListener('resize', updateTabsScrollState);
      observer?.disconnect();
    };
  }, [updateTabsScrollState, isAdmin, userProfile]);
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [couponTypes, setCouponTypes] = useState<CouponTypeMap>({});
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Identity Form & Edit State
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(userProfile?.displayName || '');
  const [editEmail, setEditEmail] = useState(userProfile?.email || '');
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Multi-Address Management State
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null); // null = list view, 'new' = add new, 'id' = editing specific
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('NSW');
  const [postcode, setPostcode] = useState('');
  const [country] = useState('Australia');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [makeDefault, setMakeDefault] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);

  // Stock Notifications State
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Derive normalized address list from userProfile
  const savedAddressesList: Address[] = React.useMemo(() => {
    if (userProfile?.addresses && userProfile.addresses.length > 0) {
      return userProfile.addresses;
    }
    if (userProfile?.address && userProfile.address.street) {
      return [{ ...userProfile.address, isDefault: true }];
    }
    return [];
  }, [userProfile]);

  const defaultAddressId = React.useMemo(() => {
    const def = savedAddressesList.find(a => a.isDefault);
    if (def) return def.id;
    if (savedAddressesList.length > 0) return savedAddressesList[0].id;
    return null;
  }, [savedAddressesList]);

  // Sync profile identity and phone when userProfile updates
  useEffect(() => {
    if (userProfile) {
      setEditDisplayName(userProfile.displayName || '');
      setEditEmail(userProfile.email || '');
      if (userProfile.phone) setPhone(userProfile.phone);
    }
  }, [userProfile]);

  useEffect(() => {
    // Wait for Firebase auth to restore the session before sending anyone to /login.
    if (authLoading) return;
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchData = async () => {
      setOrdersLoading(true);
      setNotificationsLoading(true);

      try {
        // 1. Fetch past orders
        const ordersQ = query(
          collection(db, 'orders'),
          where('customerId', '==', currentUser.uid)
        );
        const ordersSnap = await getDocs(ordersQ);
        const ordersList: Order[] = [];
        ordersSnap.forEach(d => {
          ordersList.push({ id: d.id, ...d.data() } as Order);
        });
        ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(ordersList);
      } catch (err) {
        console.error('Error loading order data:', err);
      } finally {
        setOrdersLoading(false);
      }

      try {
        const couponsSnap = await getDocs(collection(db, 'coupons'));
        const types: CouponTypeMap = {};
        couponsSnap.forEach((d) => {
          const data = d.data() as Coupon;
          if (data.discountType) types[d.id.toUpperCase()] = data.discountType;
        });
        setCouponTypes(types);
      } catch (err) {
        console.warn('Error loading coupon types for order breakdown:', err);
      }

      try {
        // 2. Fetch stock notifications
        const notifMap = new Map<string, StockNotification>();
        
        const emailsToQuery = new Set<string>();
        if (currentUser?.email) {
          emailsToQuery.add(currentUser.email.trim());
          emailsToQuery.add(currentUser.email.trim().toLowerCase());
        }
        if (userProfile?.email) {
          emailsToQuery.add(userProfile.email.trim());
          emailsToQuery.add(userProfile.email.trim().toLowerCase());
        }

        for (const em of Array.from(emailsToQuery)) {
          if (!em) continue;
          try {
            const q1 = query(collection(db, 'stockNotifications'), where('email', '==', em));
            const snap1 = await getDocs(q1);
            snap1.forEach(d => notifMap.set(d.id, { id: d.id, ...d.data() } as StockNotification));
          } catch (err) {
            console.warn(`Query for email ${em} failed:`, err);
          }
        }

        if (currentUser?.uid) {
          try {
            const qUserId = query(collection(db, 'stockNotifications'), where('userId', '==', currentUser.uid));
            const snapUserId = await getDocs(qUserId);
            snapUserId.forEach(d => notifMap.set(d.id, { id: d.id, ...d.data() } as StockNotification));
          } catch (err) {
            console.warn('Query for userId failed:', err);
          }

          try {
            const qCustId = query(collection(db, 'stockNotifications'), where('customerId', '==', currentUser.uid));
            const snapCustId = await getDocs(qCustId);
            snapCustId.forEach(d => notifMap.set(d.id, { id: d.id, ...d.data() } as StockNotification));
          } catch (err) {
            console.warn('Query for customerId failed:', err);
          }
        }

        const notifList = Array.from(notifMap.values());
        notifList.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setNotifications(notifList);

        // 3. Fetch products to get stock availability & images
        const prodSnap = await getDocs(collection(db, 'products'));
        const pMap: Record<string, Product> = {};
        prodSnap.forEach(d => {
          const p = { id: d.id, ...d.data() } as Product;
          pMap[d.id] = p;
          if (p.slug) pMap[p.slug] = p;
        });
        setProductsMap(pMap);
      } catch (err) {
        console.error('Error loading stock notifications:', err);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchData();
  }, [authLoading, currentUser, currentUser?.email, userProfile?.email, navigate]);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmail || !editEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setSavingIdentity(true);
    try {
      await updateUserProfile({
        displayName: editDisplayName.trim(),
        email: editEmail.trim(),
        phone: phone.trim()
      });
      setEditingIdentity(false);
      showToast('Account identity updated successfully!');
    } catch (err) {
      console.error('Error updating identity:', err);
      showToast('Failed to update identity. Please try again.', 'error');
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleStartAddNewAddress = () => {
    setStreet('');
    setSuburb('');
    setState('NSW');
    setPostcode('');
    setMakeDefault(savedAddressesList.length === 0);
    setEditingAddressId('new');
  };

  const handleStartEditAddress = (addr: Address) => {
    setStreet(addr.street);
    setSuburb(addr.suburb);
    setState(addr.state);
    setPostcode(addr.postcode);
    setMakeDefault(Boolean(addr.isDefault || addr.id === defaultAddressId));
    setEditingAddressId(addr.id);
  };

  const handleSaveAddressForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street || !suburb || !postcode) {
      showToast('Please fill in street, suburb, and postcode', 'error');
      return;
    }

    setSavingAddress(true);
    try {
      let updatedAddresses: Address[] = [...savedAddressesList];

      if (editingAddressId === 'new') {
        const newAddr: Address = {
          id: Math.random().toString(36).substring(2, 9),
          street: street.trim(),
          suburb: suburb.trim(),
          state,
          postcode: postcode.trim(),
          country: 'Australia',
          isDefault: makeDefault
        };

        if (makeDefault) {
          updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
        }
        updatedAddresses.push(newAddr);
      } else if (editingAddressId) {
        updatedAddresses = updatedAddresses.map(a => {
          if (a.id === editingAddressId) {
            return {
              ...a,
              street: street.trim(),
              suburb: suburb.trim(),
              state,
              postcode: postcode.trim(),
              isDefault: makeDefault
            };
          }
          return makeDefault ? { ...a, isDefault: false } : a;
        });
      }

      // Determine primary default address
      let primaryDefault = updatedAddresses.find(a => a.isDefault) || updatedAddresses[0];
      if (primaryDefault) {
        primaryDefault = { ...primaryDefault, isDefault: true };
      }

      await updateUserProfile({
        address: primaryDefault,
        addresses: updatedAddresses,
        phone: phone.trim()
      });

      setEditingAddressId(null);
      showToast(editingAddressId === 'new' ? 'New shipping address added!' : 'Shipping address updated!');
    } catch (err) {
      console.error('Error saving address:', err);
      showToast('Failed to save address. Please try again.', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetPrimaryDefault = async (addr: Address) => {
    try {
      const updatedList = savedAddressesList.map(a => ({
        ...a,
        isDefault: a.id === addr.id
      }));
      const primaryDefault = { ...addr, isDefault: true };

      await updateUserProfile({
        address: primaryDefault,
        addresses: updatedList
      });

      showToast(`Set ${addr.street} as primary shipping address`);
    } catch (err) {
      console.error('Error setting primary address:', err);
      showToast('Failed to set primary address', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const filtered = savedAddressesList.filter(a => a.id !== id);
      let primaryDefault = filtered.find(a => a.isDefault) || filtered[0] || null;
      if (primaryDefault) {
        primaryDefault = { ...primaryDefault, isDefault: true };
      }

      await updateUserProfile({
        address: primaryDefault || undefined,
        addresses: filtered
      });

      showToast('Address deleted');
    } catch (err) {
      console.error('Error deleting address:', err);
      showToast('Failed to delete address', 'error');
    }
  };

  const handleRemoveNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'stockNotifications', id));
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast('Notification alert removed');
    } catch (err) {
      console.error('Error removing notification request:', err);
      showToast('Failed to remove notification', 'error');
    }
  };

  const handleReorder = (order: Order) => {
    let count = 0;
    order.items.forEach(item => {
      addToCart({
        id: item.productId,
        name: item.name,
        brand: item.brand,
        slug: item.productId,
        price: item.price,
        currency: 'AUD',
        stock: 100,
        imageUrl: '',
        category: 'cigars',
        origin: 'Cuban',
        active: true
      }, item.quantity);
      count += item.quantity;
    });
    showToast(`Added ${count} item(s) from order ${order.orderNumber} to cart`);
    navigate('/cart');
  };

  if (authLoading) return null;
  if (!currentUser || !userProfile) return null;

  const tier = normalizeLoyaltyTier(userProfile.loyaltyTier);
  const spendable = spendablePoints(userProfile.rewardsPoints);
  const displayName = userProfile.displayName || userProfile.email;
  const initial = (displayName.trim().charAt(0) || 'C').toUpperCase();

  return (
    <div className="account-page">
      <header className="account-banner" style={{ backgroundColor: isAdmin ? '#2f0d0e' : TIER_COLORS[tier] }}>
        <div className="account-banner-inner">
          <div className="account-banner-identity">
            <div className="account-banner-top">
              <div className="account-avatar" aria-hidden="true" style={isAdmin ? { backgroundColor: 'rgba(212, 175, 55, 0.25)', color: '#d4af37' } : undefined}>
                {isAdmin ? <ShieldCheck size={22} /> : initial}
              </div>
              <div className="account-banner-titles">
                <div className="account-banner-eyebrow">{isAdmin ? 'Administrator' : 'Customer Portal'}</div>
                <div className="account-banner-tier">{isAdmin ? 'Admin account' : `${tierLabel(tier)} member`}</div>
              </div>
            </div>
            <div className="account-banner-details">
              <h1 className="account-banner-name">{displayName}</h1>
              <div className="account-banner-meta">
                <span><Mail size={14} /> {userProfile.email}</span>
                {!isAdmin && userProfile.phone && <span><Phone size={14} /> {userProfile.phone}</span>}
              </div>
            </div>
          </div>
          <button
            className="account-signout"
            onClick={() => logOut().then(() => navigate('/'))}
            type="button"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      {isAdmin ? (
        <div className="account-content-band">
          <div className="account-content" style={{ paddingTop: '1.75rem' }}>
            <AdminAccountGate variant="inline" />
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
                Admin accounts are not customer profiles
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                Loyalty, orders, addresses, and shopping tools stay on customer accounts. Use the options above to open the admin portal or sign in with a customer account instead.
              </p>
            </div>
          </div>
        </div>
      ) : (
      <>
      <nav className="account-tabs" aria-label="Account sections">
        <div className="account-tabs-rail">
          <button
            type="button"
            className="account-tabs-arrow account-tabs-arrow--prev"
            aria-label="Scroll tabs left"
            onClick={() => scrollAccountTabs(-1)}
            disabled={!canScrollTabsLeft}
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="account-tabs-scroll" ref={tabsScrollRef}>
            <div className="account-tabs-inner">
              <button type="button" className={`account-tab ${activeTab === 'account' ? 'active' : ''}`} onClick={() => chooseTab('account')}>
                <UserIcon size={16} /> Account
              </button>
              <button type="button" className={`account-tab ${activeTab === 'loyalty' ? 'active' : ''}`} onClick={() => chooseTab('loyalty')}>
                <Award size={16} /> Loyalty Program
              </button>
              <button type="button" className={`account-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => chooseTab('orders')}>
                <Package size={16} /> Orders
              </button>
              <button type="button" className={`account-tab ${activeTab === 'notify' ? 'active' : ''}`} onClick={() => chooseTab('notify')}>
                <Bell size={16} /> Stock Notify
              </button>
              <button type="button" className={`account-tab ${activeTab === 'special' ? 'active' : ''}`} onClick={() => chooseTab('special')}>
                <Mail size={16} /> Special Email
              </button>
            </div>
          </div>
          <button
            type="button"
            className="account-tabs-arrow account-tabs-arrow--next"
            aria-label="Scroll tabs right"
            onClick={() => scrollAccountTabs(1)}
            disabled={!canScrollTabsRight}
          >
            <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <div className="account-content-band">
      <div className="account-content">

        {/* Tab 1: Orders History */}
        {activeTab === 'orders' && (
          <div>
            {ordersLoading ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading order history...</div>
            ) : orders.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Orders Found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  You haven't placed any orders yet. Explore our handcrafted Cuban selection.
                </p>
                <Link to="/shop" className="btn btn-primary">Shop Cuban Cigars</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map((order) => (
                  <div key={order.id || order.orderNumber} className="card" style={{ padding: '1.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                          Placed on {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                          Order {order.orderNumber}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="badge badge-gold">{order.status}</span>
                        {order.source === 'Reward' && (
                          <span className="badge badge-amber">Reward Order</span>
                        )}
                        {order.source !== 'Reward' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleReorder(order)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            Reorder Items
                          </button>
                        )}
                      </div>
                    </div>

                    <OrderFulfilment order={order} />

                    <div style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {order.items.map((item, idx) => (
                        <OrderLine key={`${item.productId}-${idx}`} item={item} reward={order.source === 'Reward'} last={idx === order.items.length - 1} />
                      ))}
                    </div>

                    <OrderTotals order={order} couponTypes={couponTypes} />
                    {order.statusHistory?.length > 0 && (
                      <ol style={{ listStyle: 'none', margin: '1rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {[...order.statusHistory].reverse().map((entry, idx) => (
                          <li key={`${entry.timestamp}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>{entry.status}</span>
                            <span>{new Date(entry.timestamp).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Notify Me When Available Products */}
        {activeTab === 'notify' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', color: '#2f0d0e' }}>
                Notify Me When Available Products
              </h3>
              <p style={{ color: '#5c3537', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                Track out-of-stock items you've requested notifications for. We will email you the moment new stock arrives.
              </p>
            </div>

            {notificationsLoading ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading your notification watchlists...
              </div>
            ) : notifications.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  No Watchlist Notifications Found
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  When a cigar or product is out of stock, click "Notify Me When Available" on the product page to track it here.
                </p>
                <Link to="/shop" className="btn btn-primary">Browse Cigar Collection</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {notifications.map((item) => {
                  const matchingProd = productsMap[item.productId];
                  const isInStock = matchingProd ? matchingProd.stock > 0 : false;
                  const currentStock = matchingProd ? matchingProd.stock : 0;

                  return (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                            {item.productBrand}
                          </span>
                          <button
                            onClick={() => item.id && handleRemoveNotification(item.id)}
                            title="Remove alert"
                            style={{ color: 'var(--text-muted)', padding: '0.2rem' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                          {item.productName}
                        </h4>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>
                          Requested on {new Date(item.requestedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>

                        <div style={{ marginBottom: '1.25rem' }}>
                          {isInStock ? (
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Check size={14} /> In Stock Now ({currentStock} available)
                            </span>
                          ) : (
                            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Bell size={14} /> Out of Stock - Waiting for Inventory
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <Link
                          to={`/product/${matchingProd?.slug || item.productId}`}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        >
                          <ExternalLink size={14} /> View
                        </Link>

                        {isInStock && matchingProd && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                            onClick={() => {
                              addToCart(matchingProd, 1);
                              showToast(`Added ${matchingProd.brand} ${matchingProd.name} to cart`);
                            }}
                          >
                            <ShoppingCart size={14} /> Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'loyalty' && (
          <RewardsProgramPanel
            key={searchParams.get('panel') === 'shop' ? 'shop' : 'overview'}
            initialPanel={searchParams.get('panel') === 'shop' ? 'shop' : 'overview'}
          />
        )}

        {activeTab === 'account' && (
          <>
          <div className="account-summary-grid">
            {/* Left Column: Account Identity (Editable Name & Email) */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
                      Personal Profile
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setEditingIdentity(!editingIdentity)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {editingIdentity ? <X size={14} /> : <Edit2 size={14} />}
                    {editingIdentity ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>

                {editingIdentity ? (
                  <form onSubmit={handleSaveIdentity} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ color: 'var(--text-primary)' }}>Account Name</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. John Citizen"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ color: 'var(--text-primary)' }}>Email Address</label>
                      <input
                        type="email"
                        required
                        className="form-control"
                        placeholder="your.name@example.com.au"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ color: 'var(--text-primary)' }}>Contact Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="04xx xxx xxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={savingIdentity}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Check size={14} /> {savingIdentity ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingIdentity(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.95rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', letterSpacing: '0.04em' }}>DISPLAY NAME</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>{userProfile.displayName || 'Not Provided'}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', letterSpacing: '0.04em' }}>EMAIL ADDRESS</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{userProfile.email}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', letterSpacing: '0.04em' }}>CONTACT PHONE</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{userProfile.phone || 'Not provided'}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Age verification</span>
                      <strong style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem', marginTop: '0.2rem' }}>
                        <ShieldCheck size={18} /> {userProfile.ageVerified ? 'Age verified' : userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not verified'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Account Role</span>
                      <span className="badge badge-gold" style={{ textTransform: 'capitalize', marginTop: '0.2rem' }}>
                        {userProfile.role}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Member Since</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Established Account'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Loyalty Program</h3>
                <span className="badge badge-green"> {tierLabel(tier)} active</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 0 }}>
                Earn 1 point for every whole dollar spent on products after coupons, before shipping. Your tier follows points earned in the last 30 days.
              </p>
              <div style={{ display: 'grid', gap: '0.7rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>Higher tiers unlock more rewards and lower point prices.</p>
                <p style={{ margin: 0 }}>You can jump up more than one tier. If you fall short, you drop one tier at a time.</p>
              </div>
              <div style={{ marginTop: '1.25rem', padding: '1rem 1.1rem', borderRadius: '12px', background: '#f3faf6', border: '1px solid #d7efe0' }}>
                <strong style={{ display: 'block', color: '#2f0d0e', fontSize: '1.05rem' }}>{spendable} points available</strong>
                <span style={{ color: '#5c3537', fontSize: '0.85rem' }}>Linked with {userProfile.email}</span>
              </div>
              <button type="button" className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => chooseTab('loyalty')}>
                Open Loyalty Program
              </button>
            </div>
          </div>

          <div className="account-stats">
            <button type="button" className="account-stat" onClick={() => chooseTab('orders')}>
              <Package size={18} />
              <strong>{ordersLoading ? '…' : orders.length}</strong>
              <span>Orders</span>
            </button>
            <button type="button" className="account-stat" onClick={() => chooseTab('loyalty')}>
              <Award size={18} />
              <strong>{spendable}</strong>
              <span>Points</span>
            </button>
          </div>

            {/* Saved shipping addresses */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <MapPin size={20} style={{ color: '#c06517' }} /> Saved Shipping Addresses ({savedAddressesList.length})
                    </h3>
                  </div>

                  {editingAddressId === null && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleStartAddNewAddress}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={15} /> Add Another Address
                    </button>
                  )}
                </div>

                {/* View Mode: List of Saved Addresses */}
                {editingAddressId === null ? (
                  savedAddressesList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        No shipping addresses saved yet. Keep addresses on file for fast checkout.
                      </p>
                      <button className="btn btn-primary btn-sm" onClick={handleStartAddNewAddress}>
                        + Add First Address
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {savedAddressesList.map((addr) => {
                        const isPrimary = addr.id === defaultAddressId || Boolean(addr.isDefault);

                        return (
                          <div
                            key={addr.id}
                            style={{
                              padding: '1.25rem',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--bg-primary)',
                              border: isPrimary ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem', display: 'block' }}>
                                  {addr.street}
                                </strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                  {addr.suburb}, {addr.state} {addr.postcode} ({addr.country || 'Australia'})
                                </span>
                              </div>

                              {isPrimary && (
                                <span className="badge badge-gold" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                  Primary Default
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Phone: {userProfile.phone || 'Standard Contact'}
                              </span>

                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!isPrimary && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-xs"
                                    onClick={() => handleSetPrimaryDefault(addr)}
                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                                  >
                                    Set as Primary
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => handleStartEditAddress(addr)}
                                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => handleDeleteAddress(addr.id)}
                                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* Form View: Add New or Edit Existing Address */
                  <form onSubmit={handleSaveAddressForm}>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 600 }}>
                      {editingAddressId === 'new' ? 'Add New Shipping Address' : 'Edit Shipping Address'}
                    </h4>

                    <div className="form-group">
                      <label className="form-label" style={{ color: 'var(--text-primary)' }}>Street Address</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. 44 Killarney Dr"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Suburb / City</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          placeholder="Killarney Heights"
                          value={suburb}
                          onChange={(e) => setSuburb(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>State</label>
                        <select
                          className="form-control"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        >
                          <option value="NSW">NSW</option>
                          <option value="VIC">VIC</option>
                          <option value="QLD">QLD</option>
                          <option value="SA">SA</option>
                          <option value="WA">WA</option>
                          <option value="TAS">TAS</option>
                          <option value="ACT">ACT</option>
                          <option value="NT">NT</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Postcode</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          placeholder="2087"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Country</label>
                        <input
                          type="text"
                          readOnly
                          value={country}
                          className="form-control form-control--light"
                          style={{ cursor: 'not-allowed' }}
                          tabIndex={-1}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--text-primary)' }}>Contact Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          placeholder="0400 000 000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={makeDefault}
                          onChange={(e) => setMakeDefault(e.target.checked)}
                          style={{ accentColor: '#c06517', width: '16px', height: '16px' }}
                        />
                        <span>Set as my Primary Default shipping address</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingAddress}
                        style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                      >
                        <Check size={18} /> {savingAddress ? 'Saving Address...' : 'Save Address'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setEditingAddressId(null)}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'special' && (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', background: '#fff' }}>
            <Mail size={40} style={{ color: '#5c3537', marginBottom: '0.75rem' }} />
            <h3 style={{ color: '#2f0d0e', marginBottom: '0.4rem' }}>Special Email</h3>
            <p style={{ color: '#5c3537', margin: 0 }}>Coming soon.</p>
          </div>
        )}
      </div>
      </div>
      </>
      )}
    </div>
  );
};
