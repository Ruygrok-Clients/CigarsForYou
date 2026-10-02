import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Order, OrderStatus } from '../../types';
import { orderSourceLabel } from '../../utils/rewards';
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
  Search,
  Copy,
  Check,
  Ban
} from 'lucide-react';

const ORDER_STATUS_STEPS: OrderStatus[] = ['Pending', 'Verified', 'Processing', 'Shipped', 'Delivered'];

const CopyIconButton: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = value.trim();
    if (!text) {
      showToast(`No ${label.toLowerCase()} to copy`, 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      style={{
        background: 'none',
        border: '1px solid var(--border-subtle)',
        color: copied ? '#10b981' : 'var(--text-muted)',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        flexShrink: 0
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

const CopyFieldRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4rem 0' }}>
    <div style={{ minWidth: 0 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ color: 'var(--text-primary)', lineHeight: 1.45, wordBreak: 'break-word' }}>{value?.trim() || '—'}</span>
    </div>
    <CopyIconButton label={label} value={value || ''} />
  </div>
);

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
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [refundSelected, setRefundSelected] = useState(false);
  const [restoreStockByIndex, setRestoreStockByIndex] = useState<Record<number, boolean>>({});
  const [cancelling, setCancelling] = useState(false);

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

  const openCancelModal = (order: Order) => {
    if (screenLocked) {
      showToast('Screen Lock active (View-Only Mode)', 'info');
      return;
    }
    if (order.status === 'Cancelled') return;
    setCancelTarget(order);
    setRefundSelected(false);
    setRestoreStockByIndex({});
  };

  const handleCancelOrder = async () => {
    if (screenLocked || !cancelTarget?.id || cancelTarget.status === 'Cancelled') return;

    setCancelling(true);
    try {
      const order = cancelTarget;
      const now = new Date().toISOString();
      const updatedItems = order.items.map((item, idx) => ({
        ...item,
        stockRestored: item.stockRestored === true || restoreStockByIndex[idx] === true,
      }));
      const updatedHistory = [
        ...(order.statusHistory || []),
        { status: 'Cancelled' as const, timestamp: now, updatedBy: 'Admin Portal' },
      ];

      const patch: {
        status: 'Cancelled';
        statusHistory: Order['statusHistory'];
        items: Order['items'];
        refundedAt?: string;
        refundMethod?: 'manual';
        refundAmount?: number;
      } = {
        status: 'Cancelled',
        statusHistory: updatedHistory,
        items: updatedItems,
      };

      if (refundSelected) {
        patch.refundedAt = now;
        patch.refundMethod = 'manual';
        patch.refundAmount = order.totalAmount;
      }

      await updateDoc(doc(db, 'orders', order.id), patch);

      const stockCollection = order.source === 'Reward' ? 'rewardProducts' : 'products';
      for (let idx = 0; idx < order.items.length; idx++) {
        const item = order.items[idx];
        if (!restoreStockByIndex[idx] || item.stockRestored || !item.productId) continue;
        try {
          await updateDoc(doc(db, stockCollection, item.productId), { stock: increment(item.quantity) });
        } catch {
          // Ignore if the product no longer exists
        }
      }

      const next: Order = {
        ...order,
        status: 'Cancelled',
        statusHistory: updatedHistory,
        items: updatedItems,
        ...(refundSelected
          ? { refundedAt: now, refundMethod: 'manual' as const, refundAmount: order.totalAmount }
          : {}),
      };

      setOrders(prev => prev.map(o => o.id === order.id ? next : o));
      if (selectedOrder?.id === order.id) setSelectedOrder(next);
      setCancelTarget(null);
      showToast(
        refundSelected
          ? `Order ${order.orderNumber} cancelled and marked refunded`
          : `Order ${order.orderNumber} cancelled`
      );
    } catch (err) {
      console.error('Error cancelling order:', err);
      showToast('Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleArchiveOrder = async (order: Order) => {
    if (screenLocked) return;
    try {
      const orderRef = doc(db, 'orders', order.id!);
      await updateDoc(orderRef, { archived: true });

      let restoredStock = false;
      if (order.source !== 'Reward' && order.status !== 'Cancelled') {
        for (const item of order.items) {
          if (item.productId && !item.stockRestored) {
            try {
              const pRef = doc(db, 'products', item.productId);
              await updateDoc(pRef, { stock: increment(item.quantity) });
              restoredStock = true;
            } catch {
              // Ignore if product no longer exists
            }
          }
        }
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, archived: true } : o));
      showToast(
        restoredStock
          ? `Order ${order.orderNumber} moved to Bin (Stock Restored)`
          : `Order ${order.orderNumber} moved to Bin`
      );
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
                <option value="Reward">Reward Order</option>
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
                <option value="Cancelled">Cancelled</option>
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
                      {order.source === 'Reward' ? (
                        <span>
                          {order.pointsSpent ?? 0} pts
                          <div style={{ fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ${order.totalAmount.toFixed(2)} delivery
                          </div>
                        </span>
                      ) : (
                        <>${order.totalAmount.toFixed(2)} AUD</>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${order.status === 'Cancelled' ? 'badge-red' : 'badge-gold'}`}>
                        {order.status}
                      </span>
                      {order.refundedAt && (
                        <span className="badge badge-amber" style={{ marginLeft: '0.35rem' }}>Refunded</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {order.source === 'Reward' ? (
                        <span className="badge badge-amber">Reward Order</span>
                      ) : (
                        orderSourceLabel(order.source)
                      )}
                      {' · '}
                      {order.paymentMethod}
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
                            {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                              <button
                                className="btn btn-primary btn-sm"
                                title="Advance Status"
                                disabled={screenLocked}
                                onClick={() => handleAdvanceStatus(order)}
                              >
                                &rarr;
                              </button>
                            )}
                            {order.status !== 'Cancelled' && (
                              <button
                                className="btn btn-danger btn-sm"
                                title="Cancel / Refund"
                                disabled={screenLocked}
                                onClick={() => openCancelModal(order)}
                              >
                                <Ban size={14} />
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
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedOrder(null)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <span className={`badge ${selectedOrder.status === 'Cancelled' ? 'badge-red' : 'badge-gold'}`} style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                Ref: {selectedOrder.orderNumber}
              </span>
              {selectedOrder.source === 'Reward' && (
                <span className="badge badge-amber" style={{ marginLeft: '0.5rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                  Reward Order
                </span>
              )}
              <span className={`badge ${selectedOrder.status === 'Cancelled' ? 'badge-red' : 'badge-gold'}`} style={{ marginLeft: '0.5rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                {selectedOrder.status}
              </span>
              {selectedOrder.refundedAt && (
                <span className="badge badge-amber" style={{ marginLeft: '0.5rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                  Refunded
                </span>
              )}
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Order Detail & Audit
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
              {/* Customer & Address */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Customer & Delivery
                </span>
                <CopyFieldRow label="Name" value={selectedOrder.customerName} />
                <CopyFieldRow label="Phone" value={selectedOrder.customerPhone} />
                <CopyFieldRow label="Email" value={selectedOrder.customerEmail} />
                <CopyFieldRow label="Street" value={selectedOrder.deliveryAddress?.street} />
                <CopyFieldRow label="Suburb" value={selectedOrder.deliveryAddress?.suburb} />
                <CopyFieldRow label="State" value={selectedOrder.deliveryAddress?.state} />
                <CopyFieldRow label="Postcode" value={selectedOrder.deliveryAddress?.postcode} />
                <CopyFieldRow
                  label="Delivery address"
                  value={[
                    selectedOrder.deliveryAddress?.street,
                    [selectedOrder.deliveryAddress?.suburb, selectedOrder.deliveryAddress?.state, selectedOrder.deliveryAddress?.postcode].filter(Boolean).join(' ')
                  ].filter(Boolean).join(', ')}
                />
              </div>

              {/* Compliance & Payment */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    18+ Age Confirmed
                  </span>
                  <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={16} /> Yes (Checked at Checkout)
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Payment Method & Reference
                  </span>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 700, display: 'block' }}>{selectedOrder.paymentMethod}</span>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Order Line Items
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)' }}>
                      <span style={{ fontWeight: 500 }}>{item.quantity}x {item.brand} {item.name}</span>
                      <strong style={{ color: 'var(--accent-gold)' }}>
                        {selectedOrder.source === 'Reward'
                          ? `${(item.pointsCost ?? 0) * item.quantity} pts`
                          : `$${(item.price * item.quantity).toFixed(2)} AUD`}
                      </strong>
                    </div>
                  ))}

                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                    {selectedOrder.source === 'Reward' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', padding: '0.2rem 0' }}>
                        <span>Points spent</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedOrder.pointsSpent ?? 0} pts</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', padding: '0.2rem 0' }}>
                        <span>Subtotal</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${selectedOrder.subtotal?.toFixed(2)} AUD</span>
                      </div>
                    )}
                    {(selectedOrder.discountAmount ?? 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', padding: '0.2rem 0', fontWeight: 600 }}>
                        <span>Discount ({selectedOrder.couponCode || 'Coupon'})</span>
                        <span>-${selectedOrder.discountAmount?.toFixed(2)} AUD</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', padding: '0.2rem 0' }}>
                      <span>{selectedOrder.deliveryMethod === 'immediate' ? 'Immediate Dispatch' : 'Free Express Delivery'}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${(selectedOrder.shippingFee ?? 0).toFixed(2)} AUD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1.2rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>{selectedOrder.source === 'Reward' ? 'Due now' : 'Total Paid'}</span>
                <span style={{ color: 'var(--accent-gold)', fontSize: '1.4rem' }}>${selectedOrder.totalAmount.toFixed(2)} AUD</span>
              </div>

              {/* Actions in Modal */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: '1 1 180px' }}
                    disabled={screenLocked}
                    onClick={() => handleAdvanceStatus(selectedOrder)}
                  >
                    Advance Status to Next Phase
                  </button>
                )}
                {selectedOrder.status !== 'Cancelled' && (
                  <button
                    className="btn btn-danger"
                    style={{ flex: '1 1 180px' }}
                    disabled={screenLocked}
                    onClick={() => openCancelModal(selectedOrder)}
                  >
                    Cancel / Refund
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="modal-overlay" onClick={() => { if (!cancelling) setCancelTarget(null); }}>
          <div
            className="modal-content"
            style={{ maxWidth: '560px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { if (!cancelling) setCancelTarget(null); }}
              aria-label="Close"
              disabled={cancelling}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <span className="badge badge-red" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                Ref: {cancelTarget.orderNumber}
              </span>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Cancel & Refund
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                This sets the order to Cancelled. Reward points are reversed either way. There is no payment processor connected, so a recorded refund is bookkeeping only and must be processed offline.
              </p>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={refundSelected}
                disabled={cancelling}
                onChange={(e) => setRefundSelected(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span>
                <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Record refund (${cancelTarget.totalAmount.toFixed(2)} AUD)
                </span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  Marks the order as refunded manually. Payment is not sent back automatically.
                </span>
              </span>
            </label>

            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Stock
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {cancelTarget.items.map((item, idx) => (
                  <label
                    key={`${item.productId}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem',
                      cursor: item.stockRestored ? 'default' : 'pointer',
                      padding: '0.75rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.stockRestored === true || restoreStockByIndex[idx] === true}
                      disabled={cancelling || item.stockRestored === true}
                      onChange={(e) => {
                        setRestoreStockByIndex(prev => ({ ...prev, [idx]: e.target.checked }));
                      }}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <span>
                      <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 600 }}>
                        Restore {item.quantity}x {item.brand} {item.name}
                      </span>
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                        {item.stockRestored
                          ? 'Stock was already restored for this item.'
                          : 'Leave unchecked to keep this quantity deducted.'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={cancelling || screenLocked}
                onClick={handleCancelOrder}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
