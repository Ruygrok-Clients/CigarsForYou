import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import type { Order, Product, PortalStats } from '../../types';
import { 
  ShoppingBag, 
  RefreshCw, 
  Bell, 
  DollarSign, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<PortalStats>({
    totalOrders: 0,
    activeSubscriptions: 0,
    totalProducts: 0,
    lowStockProductsCount: 0,
    pendingNotificationsCount: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch Orders
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const ordersList: Order[] = [];
        let revenue = 0;
        ordersSnap.forEach(doc => {
          const o = { id: doc.id, ...doc.data() } as Order;
          ordersList.push(o);
          if (!o.archived && o.status !== 'Cancelled') {
            revenue += o.totalAmount || 0;
          }
        });

        // Filter last 5 non-archived orders
        const sortedRecent = ordersList
          .filter(o => !o.archived)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        setRecentOrders(sortedRecent);

        // Fetch Subscriptions
        const subsSnap = await getDocs(query(collection(db, 'subscriptions'), where('status', '==', 'active')));
        
        // Fetch Products
        const prodSnap = await getDocs(collection(db, 'products'));
        let lowStockCount = 0;
        prodSnap.forEach(doc => {
          const p = doc.data() as Product;
          if (p.stock <= 10) lowStockCount++;
        });

        // Fetch Stock Notifications
        const notifSnap = await getDocs(query(collection(db, 'stockNotifications'), where('notified', '==', false)));

        setStats({
          totalOrders: ordersList.length,
          activeSubscriptions: subsSnap.size,
          totalProducts: prodSnap.size,
          lowStockProductsCount: lowStockCount,
          pendingNotificationsCount: notifSnap.size,
          totalRevenue: revenue
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        padding: '2.25rem 2rem',
        borderRadius: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        marginBottom: '2rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)'
      }}>
        <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
          Real-Time Operations
        </span>
        <h1 style={{ fontSize: '2.2rem', color: '#2f0d0e', fontWeight: 700, letterSpacing: '-0.025em' }}>
          Welcome back, {userProfile?.displayName || 'Administrator'}
        </h1>
        <p style={{ color: '#515154', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Here is a live summary of orders, automated subscriptions, stock status, and pending notifications.
        </p>
      </div>

      {/* Live Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        {/* Card 1: Total Revenue */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Sales</span>
            <div style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-gold)' }}>${stats.totalRevenue.toFixed(2)}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AUD processed</span>
        </div>

        {/* Card 2: Total Orders */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</span>
            <div style={{ backgroundColor: 'rgba(46,125,50,0.15)', color: '#4caf50', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.8rem', color: '#ffffff' }}>{stats.totalOrders}</h3>
          <Link to="/admin/orders" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>View orders &rarr;</Link>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Subscriptions</span>
            <div style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.8rem', color: '#ffffff' }}>{stats.activeSubscriptions}</h3>
          <Link to="/admin/subscriptions" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>Manage cycles &rarr;</Link>
        </div>

        {/* Card 4: Low/Out-of-Stock Alert */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low/Out of Stock</span>
            <div style={{ backgroundColor: 'rgba(197,108,40,0.15)', color: 'var(--accent-amber)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.8rem', color: stats.lowStockProductsCount > 0 ? '#ff9800' : '#ffffff' }}>{stats.lowStockProductsCount}</h3>
          <Link to="/admin/products" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>Adjust inventory &rarr;</Link>
        </div>

        {/* Card 5: Stock Notifications */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Notify Requests</span>
            <div style={{ backgroundColor: 'rgba(155,44,44,0.15)', color: 'var(--accent-ruby)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.8rem', color: '#ffffff' }}>{stats.pendingNotificationsCount}</h3>
          <Link to="/admin/stock-notifications" style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', textDecoration: 'underline' }}>Export list &rarr;</Link>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Recent Storefront Orders</h3>
          <Link to="/admin/orders" className="btn btn-outline btn-sm">
            View All Orders <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading recent orders...</div>
        ) : recentOrders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No orders registered in database yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Ref #</th>
                  <th style={{ padding: '0.75rem' }}>Customer</th>
                  <th style={{ padding: '0.75rem' }}>Source</th>
                  <th style={{ padding: '0.75rem' }}>Total</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {order.orderNumber}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#ffffff' }}>
                      {order.customerName}<br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customerEmail}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{order.source}</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#ffffff' }}>
                      ${order.totalAmount.toFixed(2)} AUD
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>{order.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
