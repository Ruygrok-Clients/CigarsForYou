import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { StockNotification } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { Bell, CheckCircle2, Download, Search, Check } from 'lucide-react';

export const AdminStockNotifications: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNotified, setFilterNotified] = useState<'all' | 'pending' | 'notified'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'stockNotifications'));
      const list: StockNotification[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as StockNotification);
      });
      list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching stock notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkNotified = async (id: string) => {
    if (screenLocked) return;
    try {
      await updateDoc(doc(db, 'stockNotifications', id), { notified: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, notified: true } : n));
      showToast('Marked as notified');
    } catch (err) {
      console.error('Error updating notification status:', err);
    }
  };

  const handleBulkMarkNotified = async () => {
    if (screenLocked) return;
    const pendingList = filteredNotifications.filter(n => !n.notified);
    if (pendingList.length === 0) return;

    try {
      for (const n of pendingList) {
        if (n.id) {
          await updateDoc(doc(db, 'stockNotifications', n.id), { notified: true });
        }
      }
      showToast(`Marked ${pendingList.length} request(s) as notified`);
      fetchNotifications();
    } catch (err) {
      console.error('Error bulk updating:', err);
    }
  };

  const handleExportCSV = () => {
    if (filteredNotifications.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    const headers = ['Product Brand', 'Product Name', 'Customer Email', 'Requested Date', 'Notified Status'];
    const rows = filteredNotifications.map(n => [
      `"${n.productBrand || ''}"`,
      `"${n.productName || ''}"`,
      `"${n.email || ''}"`,
      `"${n.requestedAt ? new Date(n.requestedAt).toLocaleString('en-AU') : ''}"`,
      `"${n.notified ? 'Yes' : 'No'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cfy-stock-notifications-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterNotified === 'pending' && n.notified) return false;
    if (filterNotified === 'notified' && !n.notified) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = n.email.toLowerCase().includes(q);
      const matchProduct = (n.productName || '').toLowerCase().includes(q);
      const matchBrand = (n.productBrand || '').toLowerCase().includes(q);
      if (!matchEmail && !matchProduct && !matchBrand) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Back in Stock Customer Requests
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Stock Notifications</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={16} /> Export to CSV
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleBulkMarkNotified}
            disabled={screenLocked}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Check size={16} /> Mark All Visible Notified
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
              placeholder="Search product or customer email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn btn-sm ${filterNotified === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterNotified('pending')}
            >
              Pending ({notifications.filter(n => !n.notified).length})
            </button>
            <button
              className={`btn btn-sm ${filterNotified === 'notified' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterNotified('notified')}
            >
              Notified ({notifications.filter(n => n.notified).length})
            </button>
            <button
              className={`btn btn-sm ${filterNotified === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterNotified('all')}
            >
              All ({notifications.length})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading notification list...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>No notification requests found</h3>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Product</th>
                  <th style={{ padding: '0.75rem' }}>Customer Email</th>
                  <th style={{ padding: '0.75rem' }}>Requested Date</th>
                  <th style={{ padding: '0.75rem' }}>Notified Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map(n => (
                  <tr key={n.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem', marginRight: '0.4rem' }}>{n.productBrand}</span>
                      {n.productName}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-gold)' }}>
                      {n.email}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(n.requestedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {n.notified ? (
                        <span className="badge badge-green">Notified</span>
                      ) : (
                        <span className="badge badge-amber">Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {!n.notified && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={screenLocked}
                          onClick={() => handleMarkNotified(n.id!)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <CheckCircle2 size={14} /> Mark Notified
                        </button>
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
