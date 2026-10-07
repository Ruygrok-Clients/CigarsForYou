import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Order, OrderStatus } from '../../types';
import { orderSourceLabel } from '../../utils/rewards';
import { advanceActionLabel, nextOrderStatus } from '../../utils/orderPipeline';
import { deliveryMethodLabel } from '../../constants/deliveryCopy';
import { formatHubAddressLine, getDistributionHub } from '../../constants/distributionHubs';
import { resolveImmediateDispatch } from '../../services/immediateDispatchRemediation';
import { advanceOrderStatus } from '../../services/advanceOrderStatus';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { CopyIconButton } from '../../components/CopyIconButton';
import { 
  ShoppingBag, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Eye, 
  X, 
  ShieldCheck, 
  Search,
  Ban
} from 'lucide-react';

function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === 'Fulfilled' || status === 'Cancelled';
}

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
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchRefundTarget, setDispatchRefundTarget] = useState<Order | null>(null);
  const [dispatchRestoreStock, setDispatchRestoreStock] = useState<Record<number, boolean>>({});

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

  const [advanceTarget, setAdvanceTarget] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('Didi');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [advancing, setAdvancing] = useState(false);

  const requestAdvance = (order: Order) => {
    if (screenLocked) {
      showToast('Screen Lock active (View-Only Mode)', 'info');
      return;
    }
    const nextStatus = nextOrderStatus(order.status, order.deliveryMethod);
    if (!nextStatus || !order.id) return;
    if (nextStatus === 'Shipped') {
      setTrackingNumber('');
      setTrackingUrl('');
      setTrackingCarrier(order.deliveryMethod === 'immediate' ? 'Didi' : 'StarTrack');
      setAdvanceTarget(order);
      return;
    }
    if (nextStatus === 'Collectable') {
      setAdvanceTarget(order);
      return;
    }
    void submitAdvance(order);
  };

  const submitAdvance = async (order: Order) => {
    if (!order.id || advancing) return;
    const nextStatus = nextOrderStatus(order.status, order.deliveryMethod);
    if (!nextStatus) return;
    if (nextStatus === 'Shipped' && (!trackingNumber.trim() || !trackingCarrier.trim())) {
      showToast('Enter the tracking carrier and number.', 'error');
      return;
    }
    setAdvancing(true);
    try {
      const result = await advanceOrderStatus({
        orderId: order.id,
        ...(nextStatus === 'Shipped'
          ? {
            trackingNumber: trackingNumber.trim(),
            trackingCarrier: trackingCarrier.trim(),
            trackingUrl: trackingUrl.trim() || undefined
          }
          : {})
      });
      const next = result.order;
      const patch: Partial<Order> = {
        status: next.status,
        statusHistory: next.statusHistory || order.statusHistory,
        trackingNumber: next.trackingNumber || order.trackingNumber,
        trackingCarrier: next.trackingCarrier || order.trackingCarrier,
        trackingUrl: next.trackingUrl || order.trackingUrl
      };
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...patch } : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(prev => prev ? { ...prev, ...patch } : null);
      }
      setAdvanceTarget(null);
      const emailed = nextStatus === 'Shipped' || nextStatus === 'Collectable';
      showToast(
        emailed
          ? `Order ${order.orderNumber} is now ${next.status}. The customer has been emailed.`
          : `Advanced order ${order.orderNumber} to ${next.status}`
      );
    } catch (err) {
      console.error('Error advancing status:', err);
      showToast(callableErrorMessage(err, 'Failed to update order status'), 'error');
    } finally {
      setAdvancing(false);
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

      await updateDoc(doc(db, 'orders', order.id!), patch);

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

  const applyResolvedOrder = (orderId: string, next: Order) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...next, id: orderId } : o));
    setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, ...next, id: orderId } : prev);
  };

  const callableErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.trim()) {
      return err.message.replace(/^FirebaseError:\s*/i, '');
    }
    return fallback;
  };

  const handleMarkImmediateUnavailable = async (order: Order) => {
    if (screenLocked || !order.id) {
      if (screenLocked) showToast('Screen Lock active (View-Only Mode)', 'info');
      return;
    }
    setDispatchBusy(true);
    try {
      const result = await resolveImmediateDispatch({ orderId: order.id, action: 'mark_unavailable' });
      applyResolvedOrder(order.id, result.order);
      if (result.emailSent === false) {
        showToast(`Order ${order.orderNumber} marked unavailable, but the customer email did not send`, 'error');
      } else {
        showToast(
          result.resendOnly
            ? `Unavailable email resent for ${order.orderNumber}`
            : `Customer notified that Immediate Dispatch is unavailable for ${order.orderNumber}`
        );
      }
    } catch (err) {
      console.error('Error marking Immediate Dispatch unavailable:', err);
      showToast(callableErrorMessage(err, 'Failed to mark Immediate Dispatch unavailable'), 'error');
    } finally {
      setDispatchBusy(false);
    }
  };

  const openDispatchRefund = (order: Order) => {
    if (screenLocked) {
      showToast('Screen Lock active (View-Only Mode)', 'info');
      return;
    }
    setDispatchRefundTarget(order);
    setDispatchRestoreStock({});
  };

  const handleDispatchFullRefund = async () => {
    if (screenLocked || !dispatchRefundTarget?.id) return;
    setDispatchBusy(true);
    try {
      const order = dispatchRefundTarget;
      const restoreStockIndexes = order.items
        .map((item, idx) => (item.stockRestored || dispatchRestoreStock[idx] ? idx : -1))
        .filter(idx => idx >= 0);
      const result = await resolveImmediateDispatch({
        orderId: order.id!,
        action: 'full_refund',
        restoreStockIndexes,
      });
      applyResolvedOrder(order.id!, result.order);
      setDispatchRefundTarget(null);
      showToast(`Order ${order.orderNumber} cancelled and marked fully refunded`);
    } catch (err) {
      console.error('Error recording Immediate Dispatch refund:', err);
      showToast(callableErrorMessage(err, 'Failed to record the full refund'), 'error');
    } finally {
      setDispatchBusy(false);
    }
  };

  const handleExpressUpgrade = async (order: Order) => {
    if (screenLocked || !order.id) {
      if (screenLocked) showToast('Screen Lock active (View-Only Mode)', 'info');
      return;
    }
    setDispatchBusy(true);
    try {
      const result = await resolveImmediateDispatch({ orderId: order.id, action: 'express_upgrade' });
      applyResolvedOrder(order.id, result.order);
      const fee = order.shippingFee ?? 0;
      showToast(`Order ${order.orderNumber} moved to complimentary Express. Immediate fee $${fee.toFixed(2)} marked refunded.`);
    } catch (err) {
      console.error('Error recording Express upgrade:', err);
      showToast(callableErrorMessage(err, 'Failed to record the Express upgrade'), 'error');
    } finally {
      setDispatchBusy(false);
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
                <option value="Order Placed">Order Placed</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Fulfilled">Fulfilled</option>
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
                      {order.immediateDispatchResolution === 'pending_customer' && (
                        <span className="badge badge-red" style={{ marginLeft: '0.35rem' }}>Dispatch unavailable</span>
                      )}
                      {order.immediateDispatchResolution === 'express_upgrade' && (
                        <span className="badge badge-amber" style={{ marginLeft: '0.35rem' }}>Express upgrade</span>
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
                            {!isTerminalOrderStatus(order.status) && (
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={screenLocked}
                                onClick={() => requestAdvance(order)}
                                title={advanceActionLabel(nextOrderStatus(order.status, order.deliveryMethod) || 'Fulfilled')}
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
        <Modal onClick={() => setSelectedOrder(null)}>
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
              {selectedOrder.immediateDispatchResolution === 'pending_customer' && (
                <span className="badge badge-red" style={{ marginLeft: '0.5rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                  Dispatch unavailable
                </span>
              )}
              {selectedOrder.immediateDispatchResolution === 'express_upgrade' && (
                <span className="badge badge-amber" style={{ marginLeft: '0.5rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                  Complimentary Express
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
                  label={selectedOrder.deliveryMethod === 'pickup' ? 'Collection address' : 'Delivery address'}
                  value={selectedOrder.deliveryMethod === 'pickup'
                    ? (getDistributionHub(selectedOrder.pickupHubId) ? formatHubAddressLine(getDistributionHub(selectedOrder.pickupHubId)!) : [
                      selectedOrder.deliveryAddress?.street,
                      [selectedOrder.deliveryAddress?.suburb, selectedOrder.deliveryAddress?.state, selectedOrder.deliveryAddress?.postcode].filter(Boolean).join(' ')
                    ].filter(Boolean).join(', '))
                    : [
                      selectedOrder.deliveryAddress?.street,
                      [selectedOrder.deliveryAddress?.suburb, selectedOrder.deliveryAddress?.state, selectedOrder.deliveryAddress?.postcode].filter(Boolean).join(' ')
                    ].filter(Boolean).join(', ')}
                />
                {selectedOrder.trackingNumber && (
                  <CopyFieldRow label={selectedOrder.trackingCarrier || 'Tracking'} value={selectedOrder.trackingNumber} />
                )}
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
                      <span>{deliveryMethodLabel(selectedOrder.deliveryMethod)}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${(selectedOrder.shippingFee ?? 0).toFixed(2)} AUD</span>
                    </div>
                    {(selectedOrder.immediateDispatchFeeRefunded ?? 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', padding: '0.2rem 0', fontWeight: 600 }}>
                        <span>Immediate Dispatch fee refunded</span>
                        <span>-${selectedOrder.immediateDispatchFeeRefunded?.toFixed(2)} AUD</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1.2rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>{selectedOrder.source === 'Reward' ? 'Due now' : 'Total Paid'}</span>
                <span style={{ color: 'var(--accent-gold)', fontSize: '1.4rem' }}>${selectedOrder.totalAmount.toFixed(2)} AUD</span>
              </div>

              {selectedOrder.deliveryMethod === 'immediate' && !isTerminalOrderStatus(selectedOrder.status) && selectedOrder.immediateDispatchResolution !== 'full_refund' && (
                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-surface-elevated)'
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Immediate Dispatch
                  </span>
                  {selectedOrder.immediateDispatchResolution === 'pending_customer' ? (
                    <>
                      <p style={{ margin: '0 0 0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        The customer has been emailed. After they reply or call, record their choice. A full refund cancels the order. Complimentary Express refunds the Immediate Dispatch fee and ships at $0.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ flex: '1 1 180px' }}
                          disabled={screenLocked || dispatchBusy}
                          onClick={() => openDispatchRefund(selectedOrder)}
                        >
                          Record Full Refund
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ flex: '1 1 180px' }}
                          disabled={screenLocked || dispatchBusy}
                          onClick={() => handleExpressUpgrade(selectedOrder)}
                        >
                          Record Complimentary Express
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ flex: '1 1 180px' }}
                          disabled={screenLocked || dispatchBusy}
                          onClick={() => handleMarkImmediateUnavailable(selectedOrder)}
                        >
                          Resend Email
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        If Didi cannot take this delivery, mark it unavailable. The customer receives an email with a full refund or complimentary Express, and you record their reply here.
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={screenLocked || dispatchBusy}
                        onClick={() => handleMarkImmediateUnavailable(selectedOrder)}
                      >
                        {dispatchBusy ? 'Sending…' : 'Mark Immediate Dispatch Unavailable'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Actions in Modal */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {!isTerminalOrderStatus(selectedOrder.status) && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: '1 1 180px' }}
                    disabled={screenLocked}
                    onClick={() => requestAdvance(selectedOrder)}
                  >
                    {advanceActionLabel(nextOrderStatus(selectedOrder.status, selectedOrder.deliveryMethod) || 'Fulfilled')}
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
        </Modal>
      )}

      {advanceTarget && (
        <Modal onClick={() => { if (!advancing) setAdvanceTarget(null); }}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { if (!advancing) setAdvanceTarget(null); }}
              aria-label="Close"
              disabled={advancing}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            {nextOrderStatus(advanceTarget.status, advanceTarget.deliveryMethod) === 'Collectable' ? (
              <>
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Mark order collectable?</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  This emails {advanceTarget.customerName} that order {advanceTarget.orderNumber} is ready to collect
                  {getDistributionHub(advanceTarget.pickupHubId) ? ` from ${formatHubAddressLine(getDistributionHub(advanceTarget.pickupHubId)!)}` : ''}.
                  Collection is 7:00am to 7:00pm.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" disabled={advancing} onClick={() => setAdvanceTarget(null)}>Back</button>
                  <button type="button" className="btn btn-primary" disabled={advancing} onClick={() => submitAdvance(advanceTarget)}>
                    {advancing ? 'Sending…' : 'Confirm and email customer'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>
                  {advanceTarget.deliveryMethod === 'immediate' ? 'Didi tracking' : 'Shipping tracking'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {advanceTarget.deliveryMethod === 'immediate'
                    ? 'Enter the Didi tracking details. Confirming marks the order shipped and emails the customer that it is on its way.'
                    : 'Enter the Express Shipping label or tracking details. Confirming marks the order shipped and emails the customer that it is on its way.'}
                </p>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Carrier</label>
                {advanceTarget.deliveryMethod === 'immediate' ? (
                  <input className="form-control" value="Didi" readOnly style={{ marginBottom: '0.85rem' }} />
                ) : (
                  <select className="form-control" value={trackingCarrier} onChange={(e) => setTrackingCarrier(e.target.value)} style={{ marginBottom: '0.85rem' }}>
                    <option value="StarTrack">StarTrack</option>
                    <option value="AusPost">AusPost</option>
                    <option value="Other">Other</option>
                  </select>
                )}
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Tracking number</label>
                <input className="form-control" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} style={{ marginBottom: '0.85rem' }} />
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Tracking link (optional)</label>
                <input className="form-control" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} style={{ marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" disabled={advancing} onClick={() => setAdvanceTarget(null)}>Back</button>
                  <button type="button" className="btn btn-primary" disabled={advancing} onClick={() => submitAdvance(advanceTarget)}>
                    {advancing ? 'Sending…' : 'Confirm and email customer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <Modal onClick={() => { if (!cancelling) setCancelTarget(null); }}>
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
        </Modal>
      )}

      {dispatchRefundTarget && (
        <Modal onClick={() => { if (!dispatchBusy) setDispatchRefundTarget(null); }}>
          <div
            className="modal-content"
            style={{ maxWidth: '560px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { if (!dispatchBusy) setDispatchRefundTarget(null); }}
              aria-label="Close"
              disabled={dispatchBusy}
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
                Ref: {dispatchRefundTarget.orderNumber}
              </span>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Full Refund
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Cancels the order and records a manual refund of ${dispatchRefundTarget.totalAmount.toFixed(2)} AUD, including the Immediate Dispatch fee. Payment is not sent back automatically.
              </p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Stock
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {dispatchRefundTarget.items.map((item, idx) => (
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
                      checked={item.stockRestored === true || dispatchRestoreStock[idx] === true}
                      disabled={dispatchBusy || item.stockRestored === true}
                      onChange={(e) => {
                        setDispatchRestoreStock(prev => ({ ...prev, [idx]: e.target.checked }));
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
                disabled={dispatchBusy}
                onClick={() => setDispatchRefundTarget(null)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={dispatchBusy || screenLocked}
                onClick={handleDispatchFullRefund}
              >
                {dispatchBusy ? 'Recording…' : 'Record Full Refund'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
