import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import type { Order, Subscription } from '../types';
import { 
  User as UserIcon, 
  Package, 
  RefreshCw, 
  LogOut, 
  ShieldCheck,
  Pause,
  Play,
  XCircle,
  ShoppingBag
} from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { currentUser, userProfile, logOut } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'subscriptions' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch past orders
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

        // Fetch subscriptions
        const subsQ = query(
          collection(db, 'subscriptions'),
          where('customerId', '==', currentUser.uid)
        );
        const subsSnap = await getDocs(subsQ);
        const subsList: Subscription[] = [];
        subsSnap.forEach(d => {
          subsList.push({ id: d.id, ...d.data() } as Subscription);
        });
        setSubscriptions(subsList);
      } catch (err) {
        console.error('Error loading account data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

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

  const handleUpdateSubStatus = async (subId: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      const subRef = doc(db, 'subscriptions', subId);
      await updateDoc(subRef, { status: newStatus });
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, status: newStatus } : s));
      showToast(`Subscription status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating subscription:', err);
      showToast('Failed to update subscription status', 'error');
    }
  };

  const handleUpdateSubFrequency = async (subId: string, newFreq: 2 | 4 | 6 | 8) => {
    try {
      const subRef = doc(db, 'subscriptions', subId);
      await updateDoc(subRef, { frequencyWeeks: newFreq });
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, frequencyWeeks: newFreq } : s));
      showToast(`Subscription frequency updated to every ${newFreq} weeks`);
    } catch (err) {
      console.error('Error updating frequency:', err);
      showToast('Failed to update frequency', 'error');
    }
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
            <h1 style={{ fontSize: '2.5rem', color: '#ffffff' }}>
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
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Package size={18} /> Order History ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`btn ${activeTab === 'subscriptions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={18} /> My Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <UserIcon size={18} /> Account Profile
          </button>
        </div>

        {/* Tab 1: Orders History */}
        {activeTab === 'orders' && (
          <div>
            {loading ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>No Orders Found</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You have not placed any cigar orders yet.</p>
                <Link to="/shop" className="btn btn-primary">Start Shopping</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map(order => (
                  <div key={order.id} className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reference:</span>
                        <h3 style={{ fontSize: '1.3rem', color: 'var(--accent-gold)' }}>{order.orderNumber}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Placed on {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="badge badge-gold">{order.status}</span>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleReorder(order)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <ShoppingBag size={14} /> Reorder All
                        </button>
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ color: '#ffffff' }}>
                            {item.quantity}x {item.brand} {item.name}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>${item.price * item.quantity} AUD</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Paid</span>
                      <span style={{ color: 'var(--accent-gold)', fontSize: '1.15rem' }}>${order.totalAmount.toFixed(2)} AUD</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Subscriptions Management */}
        {activeTab === 'subscriptions' && (
          <div>
            {loading ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading subscriptions...</div>
            ) : subscriptions.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <RefreshCw size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>No Active Subscriptions</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Subscribe to your favorite cigars for automated humidor restock on a 2, 4, 6, or 8-week cycle.
                </p>
                <Link to="/shop" className="btn btn-primary">Browse Subscription Cigars</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {subscriptions.map(sub => (
                  <div key={sub.id} className="card" style={{ padding: '1.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div>
                        <span className="badge badge-gold" style={{ marginBottom: '0.35rem' }}>
                          {sub.productBrand}
                        </span>
                        <h3 style={{ fontSize: '1.5rem', color: '#ffffff' }}>
                          {sub.productName} ({sub.quantity}x)
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {sub.status === 'active' && <span className="badge badge-green">Active</span>}
                        {sub.status === 'paused' && <span className="badge badge-amber">Paused</span>}
                        {sub.status === 'cancelled' && <span className="badge badge-red">Cancelled</span>}
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '1rem',
                      backgroundColor: 'var(--bg-primary)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '1.5rem',
                      fontSize: '0.875rem'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Delivery Cycle</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <select
                            className="form-control"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: 'auto' }}
                            value={sub.frequencyWeeks}
                            onChange={(e) => handleUpdateSubFrequency(sub.id!, Number(e.target.value) as any)}
                            disabled={sub.status === 'cancelled'}
                          >
                            <option value={2}>Every 2 Weeks</option>
                            <option value={4}>Every 4 Weeks</option>
                            <option value={6}>Every 6 Weeks</option>
                            <option value={8}>Every 8 Weeks</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Price per Delivery</span>
                        <strong style={{ color: 'var(--accent-gold)', fontSize: '1.05rem' }}>${sub.pricePerDelivery} AUD</strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Next Billing Date</span>
                        <span style={{ color: '#ffffff' }}>
                          {new Date(sub.nextBillingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    {sub.status !== 'cancelled' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {sub.status === 'active' ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleUpdateSubStatus(sub.id!, 'paused')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Pause size={14} /> Pause Subscription
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleUpdateSubStatus(sub.id!, 'active')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Play size={14} /> Resume Subscription
                          </button>
                        )}

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleUpdateSubStatus(sub.id!, 'cancelled')}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <XCircle size={14} /> Cancel Subscription
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: User Profile & Age Audit Data */}
        {activeTab === 'profile' && (
          <div className="card" style={{ padding: '2rem', maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '1.5rem' }}>
              Account & Regulatory Info
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Account Name</span>
                <strong style={{ color: '#ffffff', fontSize: '1.1rem' }}>{userProfile.displayName || 'Not Provided'}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Email Address</span>
                <strong style={{ color: '#ffffff' }}>{userProfile.email}</strong>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
