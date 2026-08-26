import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import type { Order } from '../types';
import { 
  User as UserIcon, 
  Package, 
  LogOut, 
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { currentUser, userProfile, logOut } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
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
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading order history...</div>
            ) : orders.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.5rem' }}>No Orders Found</h3>
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
                        <h3 style={{ fontSize: '1.4rem', color: '#ffffff', margin: '0.2rem 0' }}>
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

        {/* Tab 2: User Profile & Age Audit Data */}
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
