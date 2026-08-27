import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Order, OrderStatus } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { 
  ShoppingBag, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Eye, 
  X, 
  ShieldCheck, 
  Search
} from 'lucide-react';

const ORDER_STATUS_STEPS: OrderStatus[] = ['Pending', 'Verified', 'Processing', 'Shipped', 'Delivered'];

export const AdminOrders: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const list: Order[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Order);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAdvanceStatus = async (order: Order) => {
    if (screenLocked) {
      showToast('Screen Lock active (View-Only Mode)', 'info');
      return;
    }

    const currentIndex = ORDER_STATUS_STEPS.indexOf(order.status);
    if (currentIndex < 0 || currentIndex >= ORDER_STATUS_STEPS.length - 1) return;

    const nextStatus = ORDER_STATUS_STEPS[currentIndex + 1];
    try {
      const orderRef = doc(db, 'orders', order.id!);
      const updatedHistory = [
        ...(order.statusHistory || []),
        { status: nextStatus, timestamp: new Date().toISOString(), updatedBy: 'Admin Portal' }
      ];

      await updateDoc(orderRef, {
        status: nextStatus,
        statusHistory: updatedHistory
      });

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus, statusHistory: updatedHistory } : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(prev => prev ? { ...prev, status: nextStatus, statusHistory: updatedHistory } : null);
      }
      showToast(`Advanced order ${order.orderNumber} to ${nextStatus}`);
    } catch (err) {
      console.error('Error advancing status:', err);
      showToast('Failed to update order status', 'error');
    }
  };

  const handleArchiveOrder = async (order: Order) => {
    if (screenLocked) return;
    try {
      const orderRef = doc(db, 'orders', order.id!);
      await updateDoc(orderRef, { archived: true });

      // Restore inventory stock for line items when archived/binned
      for (const item of order.items) {
        if (item.productId) {
          try {
            const pRef = doc(db, 'products', item.productId);
            await updateDoc(pRef, { stock: increment(item.quantity) });
          } catch (e) {
            // Ignore if product no longer exists
          }
        }
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, archived: true } : o));
      showToast(`Order ${order.orderNumber} moved to Bin (Stock Restored)`);
    } catch (err) {
      console.error('Error archiving order:', err);
    }
  };

  const handleRestoreOrder = async (order: Order) => {
    if (screenLocked) return;
    try {
      const orderRef = doc(db, 'orders', order.id!);
      await updateDoc(orderRef, { archived: false });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, archived: false } : o));
      showToast(`Order ${order.orderNumber} restored to active list`);
    } catch (err) {
      console.error('Error restoring order:', err);
    }
  };

  const handleDeletePermanent = async (orderId: string) => {
    if (screenLocked) return;
    if (!window.confirm('Permanently delete this order from database?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      showToast('Order deleted permanently');
    } catch (err) {
      console.error('Error deleting order:', err);
    }
  };

  const filteredOrders = orders.filter(o => {
    // Tab filter
    if (viewTab === 'active' && o.archived) return false;
    if (viewTab === 'archived' && !o.archived) return false;

    // Source filter
    if (sourceFilter !== 'all' && o.source !== sourceFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = o.orderNumber.toLowerCase().includes(q);
      const matchName = o.customerName.toLowerCase().includes(q);
      const matchEmail = o.customerEmail.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchEmail) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Customer Orders Management
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Orders & Deliveries</h1>
        </div>

        {/* View Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setViewTab('active')}
            className={`btn btn-sm ${viewTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Active Orders ({orders.filter(o => !o.archived).length})
          </button>
          <button
            onClick={() => setViewTab('archived')}
            className={`btn btn-sm ${viewTab === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Bin / Archived ({orders.filter(o => o.archived).length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search Ref #, Customer Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Source:</span>
              <select
                className="form-control"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="Website">Website</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
              <select
                className="form-control"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Verified">Verified</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading order records...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>No matching orders found</h3>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Ref #</th>
                  <th style={{ padding: '0.75rem' }}>Customer</th>
                  <th style={{ padding: '0.75rem' }}>Items</th>
                  <th style={{ padding: '0.75rem' }}>Total</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Source / Payment</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {order.orderNumber}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                      <strong>{order.customerName}</strong><br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.customerEmail}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${order.totalAmount.toFixed(2)} AUD
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-gold">{order.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {order.source} · {order.paymentMethod}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="View Full Detail"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye size={14} />
                        </button>

                        {viewTab === 'active' ? (
                          <>
                            {order.status !== 'Delivered' && (
                              <button
                                className="btn btn-primary btn-sm"
                                title="Advance Status"
                                disabled={screenLocked}
                                onClick={() => handleAdvanceStatus(order)}
                              >
                                &rarr;
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Archive to Bin (Restores Stock)"
                              disabled={screenLocked}
                              onClick={() => handleArchiveOrder(order)}
                            >
                              <Archive size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Restore Order"
                              disabled={screenLocked}
                              onClick={() => handleRestoreOrder(order)}
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Permanent Delete"
                              disabled={screenLocked}
                              onClick={() => handleDeletePermanent(order.id!)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', position: 'relative' }}>
            <button
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
                Ref: {selectedOrder.orderNumber}
              </span>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>Order Detail & Audit</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
              {/* Customer & Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Customer Info</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.customerName}</strong><br />
                  <span style={{ color: 'var(--text-secondary)' }}>{selectedOrder.customerEmail}</span>
                  {selectedOrder.customerPhone && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>📞 {selectedOrder.customerPhone}</div>}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Delivery Address</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {selectedOrder.deliveryAddress.street}<br />
                    {selectedOrder.deliveryAddress.suburb} {selectedOrder.deliveryAddress.state} {selectedOrder.deliveryAddress.postcode}
                  </span>
                </div>
              </div>

              {/* Compliance & Payment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>18+ Age Confirmed</span>
                  <span style={{ color: '#4caf50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={16} /> Yes (Checked at Checkout)
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Payment Method & Reference</span>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 600, display: 'block' }}>{selectedOrder.paymentMethod}</span>
                  {selectedOrder.stripeSessionId && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      Stripe: {selectedOrder.stripeSessionId}
                    </span>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Order Line Items</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                      <span>{item.quantity}x {item.brand} {item.name}</span>
                      <strong style={{ color: 'var(--accent-gold)' }}>${(item.price * item.quantity).toFixed(2)} AUD</strong>
                    </div>
                  ))}

                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem', paddingTop: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Subtotal</span>
                      <span>${selectedOrder.subtotal?.toFixed(2)} AUD</span>
                    </div>
                    {(selectedOrder.discountAmount ?? 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50' }}>
                        <span>Discount ({selectedOrder.couponCode || 'Coupon'})</span>
                        <span>-${selectedOrder.discountAmount?.toFixed(2)} AUD</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Express Shipping</span>
                      <span>${(selectedOrder.shippingFee ?? 25).toFixed(2)} AUD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1.1rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>Total Paid</span>
                <span style={{ color: 'var(--accent-gold)' }}>${selectedOrder.totalAmount.toFixed(2)} AUD</span>
              </div>

              {/* Actions in Modal */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                {selectedOrder.status !== 'Delivered' && (
                  <button
                    className="btn btn-primary btn-full"
                    disabled={screenLocked}
                    onClick={() => handleAdvanceStatus(selectedOrder)}
                  >
                    Advance Status to Next Phase
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
