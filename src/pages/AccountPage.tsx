import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import type { Order, StockNotification, Product, Address } from '../types';
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
  Crown,
  Sparkles,
  Gift,
  ShoppingCart,
  ThumbsUp,
  Edit2,
  X,
  Plus
} from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { currentUser, userProfile, logOut, updateUserProfile } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'notify' | 'rewards' | 'profile'>('orders');
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
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

  // Rewards Program Voting State
  const [hasVotedInterest, setHasVotedInterest] = useState(false);

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

  // Sync profile identity, phone, and rewards voting when userProfile updates
  useEffect(() => {
    if (userProfile) {
      setEditDisplayName(userProfile.displayName || '');
      setEditEmail(userProfile.email || '');
      if (userProfile.phone) setPhone(userProfile.phone);
      if (userProfile.rewardsProgramInterest) {
        setHasVotedInterest(true);
      }
    }
  }, [userProfile]);

  const handleVoteRewardsInterest = async () => {
    if (hasVotedInterest || !currentUser) return;
    try {
      setHasVotedInterest(true);
      await updateUserProfile({
        rewardsProgramInterest: true,
        rewardsProgramVotedAt: new Date().toISOString()
      });
      showToast('Thank you! Your vote of interest in the Rewards Program has been registered.');
    } catch (err) {
      console.error('Error recording rewards interest vote:', err);
      showToast('Failed to register vote. Please try again.', 'error');
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
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
  }, [currentUser, currentUser?.email, userProfile?.email, navigate]);

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
        email: editEmail.trim()
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

  if (!currentUser || !userProfile) return null;

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
              Customer Portal
            </span>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>
              Welcome, {userProfile.displayName || userProfile.email}
            </h1>
          </div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => logOut().then(() => navigate('/'))}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
          >
            <Package size={18} /> Order History ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('notify')}
            className={`btn ${activeTab === 'notify' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
          >
            <Bell size={18} /> Notify me When Available ({notifications.length})
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`btn ${activeTab === 'rewards' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
          >
            <Award size={18} /> Rewards Program
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
          >
            <UserIcon size={18} /> Account Profile
          </button>
        </div>

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
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleReorder(order)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          Reorder Items
                        </button>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: idx < order.items.length - 1 ? '1px solid var(--border-subtle)' : 'none', fontSize: '0.9rem' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{item.quantity}x {item.brand} {item.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>${(item.price * item.quantity).toFixed(2)} AUD</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Paid</span>
                      <span style={{ color: 'var(--accent-gold)', fontSize: '1.15rem' }}>${order.totalAmount.toFixed(2)} AUD</span>
                    </div>
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
              <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
                Waitlist & Back In Stock
              </span>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                Notify Me When Available Products
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
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

        {/* Tab 3: Rewards Program (Coming Soon) */}
        {activeTab === 'rewards' && (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', width: '100%' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: 'rgba(192, 101, 23, 0.12)',
              color: '#c06517',
              border: '1px solid rgba(192, 101, 23, 0.25)',
              marginBottom: '1.5rem'
            }}>
              <Award size={40} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="badge badge-gold" style={{ padding: '0.4rem 1rem' }}>
                VIP Lounge
              </span>
              <span className="badge badge-amber" style={{ padding: '0.4rem 1rem' }}>
                Coming Soon
              </span>
            </div>

            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              CigarsForYou Rewards Program
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '640px', margin: '0 auto 2.5rem auto' }}>
              We are crafting an exclusive VIP Rewards Program for our valued Cuban cigar connoisseurs. Earn loyalty points on every order, unlock priority allocation access to rare limited-edition vitolas, and enjoy curated perks.
            </p>

            {/* Feature Teasers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
              textAlign: 'left',
              marginBottom: '2.5rem'
            }}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <Crown size={26} style={{ color: '#c06517', marginBottom: '0.75rem' }} />
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Points per Purchase
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                  Earn 1 Point for every $1 spent across all handcrafted cigars.
                </p>
              </div>

              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <Sparkles size={26} style={{ color: '#c06517', marginBottom: '0.75rem' }} />
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Rare Drop Priority
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                  Early notification & priority reservations on limited vitolas and aged stock.
                </p>
              </div>

              <div style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <Gift size={26} style={{ color: '#c06517', marginBottom: '0.75rem' }} />
                <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Anniversary Gifts
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                  Exclusive birthday humidor accessories and tier bonus vouchers.
                </p>
              </div>
            </div>

            {/* Interest Voting Button */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button
                onClick={handleVoteRewardsInterest}
                className={`btn ${hasVotedInterest ? 'btn-secondary' : 'btn-primary'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem clamp(0.65rem, 3vw, 2.25rem)',
                  fontSize: 'clamp(0.8rem, 3.2vw, 1.05rem)',
                  maxWidth: '100%',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  textAlign: 'center',
                  borderRadius: '6px',
                  backgroundColor: hasVotedInterest ? undefined : '#c06517',
                  color: '#ffffff'
                }}
                disabled={hasVotedInterest}
              >
                {hasVotedInterest ? (
                  <>
                    <Check size={20} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 'inherit' }}>Interest Registered — Thank You!</span>
                  </>
                ) : (
                  <>
                    <ThumbsUp size={20} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 'inherit' }}>Vote Yes to Show Interest</span>
                  </>
                )}
              </button>
            </div>

            <div style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(192, 101, 23, 0.08)',
              border: '1px solid rgba(192, 101, 23, 0.2)',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              maxWidth: '680px',
              margin: '0 auto'
            }}>
              <p style={{ margin: 0 }}>
                💡 <strong>Good news!</strong> As an active account member (<strong>{userProfile.email}</strong>), you will automatically receive <strong>100 Bonus Welcome Points</strong> upon official program launch.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Account Profile & Saved Shipping Address File (2 Columns Equal Height) */}
        {activeTab === 'profile' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
            alignItems: 'stretch'
          }}>
            {/* Left Column: Account Identity (Editable Name & Email) */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <span className="badge badge-gold" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                      Account Identity
                    </span>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
                      Account & Regulatory Info
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setEditingIdentity(!editingIdentity)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {editingIdentity ? <X size={14} /> : <Edit2 size={14} />}
                    {editingIdentity ? 'Cancel' : 'Edit Identity'}
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
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Account Name</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>{userProfile.displayName || 'Not Provided'}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Email Address</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{userProfile.email}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Verified Date of Birth</span>
                      <strong style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem', marginTop: '0.2rem' }}>
                        <ShieldCheck size={18} /> {userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Verified 18+'}
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

            {/* Right Column: Multi-Address Shipping File */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span className="badge badge-gold" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                      Shipping File
                    </span>
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
                          className="form-control"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#2f0d0e',
                            cursor: 'not-allowed',
                            borderColor: 'var(--border-color)'
                          }}
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
          </div>
        )}
      </div>
    </div>
  );
};
