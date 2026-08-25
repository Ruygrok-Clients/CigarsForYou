import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Subscription } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { RefreshCw, Search, Pause, Play, XCircle } from 'lucide-react';

export const AdminSubscriptions: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'subscriptions'));
      const list: Subscription[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Subscription);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubscriptions(list);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleUpdateStatus = async (subId: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    if (screenLocked) return;
    try {
      await updateDoc(doc(db, 'subscriptions', subId), { status: newStatus });
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, status: newStatus } : s));
      showToast(`Updated subscription status to ${newStatus}`);
    } catch (err) {
      console.error('Error updating subscription:', err);
    }
  };

  const filteredSubscriptions = subscriptions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCust = (s.customerName || '').toLowerCase().includes(q) || (s.customerEmail || '').toLowerCase().includes(q);
      const matchProd = (s.productName || '').toLowerCase().includes(q) || (s.productBrand || '').toLowerCase().includes(q);
      if (!matchCust && !matchProd) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Automated Recurring Deliveries
          </span>
          <h1 style={{ fontSize: '2.2rem', color: '#ffffff' }}>Customer Subscriptions</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({subscriptions.filter(s => s.status === 'active').length})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'paused' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('paused')}
          >
            Paused ({subscriptions.filter(s => s.status === 'paused').length})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({subscriptions.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search customer email, product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading subscriptions...</div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <RefreshCw size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', color: '#ffffff' }}>No matching subscriptions</h3>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Customer</th>
                  <th style={{ padding: '0.75rem' }}>Product Lineup</th>
                  <th style={{ padding: '0.75rem' }}>Frequency</th>
                  <th style={{ padding: '0.75rem' }}>Recurring Total</th>
                  <th style={{ padding: '0.75rem' }}>Next Billing</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: '#ffffff' }}>
                      <strong>{s.customerName || 'Customer'}</strong><br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.customerEmail}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-gold)' }}>
                      {s.quantity}x {s.productBrand} {s.productName}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-gray">Every {s.frequencyWeeks} Weeks</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#ffffff' }}>
                      ${s.pricePerDelivery} AUD
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(s.nextBillingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {s.status === 'active' && <span className="badge badge-green">Active</span>}
                      {s.status === 'paused' && <span className="badge badge-amber">Paused</span>}
                      {s.status === 'cancelled' && <span className="badge badge-red">Cancelled</span>}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {s.status !== 'cancelled' && (
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {s.status === 'active' ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Pause"
                              disabled={screenLocked}
                              onClick={() => handleUpdateStatus(s.id!, 'paused')}
                            >
                              <Pause size={14} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              title="Resume"
                              disabled={screenLocked}
                              onClick={() => handleUpdateStatus(s.id!, 'active')}
                            >
                              <Play size={14} />
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            title="Cancel"
                            disabled={screenLocked}
                            onClick={() => handleUpdateStatus(s.id!, 'cancelled')}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
