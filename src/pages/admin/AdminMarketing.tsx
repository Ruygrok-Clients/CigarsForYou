import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Coupon, EmailSubscriber } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { Plus, Trash2, Download, X } from 'lucide-react';
import { Modal } from '../../components/Modal';

export const AdminMarketing: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'coupons' | 'subscribers'>('coupons');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);

  // Modal State for Coupon
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage');
  const [amount, setAmount] = useState(10);
  const [minSpend, setMinSpend] = useState(0);

  const fetchData = async () => {
    try {
      // Fetch Coupons
      const couponSnap = await getDocs(collection(db, 'coupons'));
      const cList: Coupon[] = [];
      couponSnap.forEach(d => {
        cList.push({ code: d.id, ...d.data() } as Coupon);
      });
      setCoupons(cList);

      // Fetch Email Subscribers
      const subSnap = await getDocs(collection(db, 'emailSubscribers'));
      const sList: EmailSubscriber[] = [];
      subSnap.forEach(d => {
        sList.push({ id: d.id, ...d.data() } as EmailSubscriber);
      });
      sList.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
      setSubscribers(sList);
    } catch (err) {
      console.error('Error loading marketing data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenLocked || !code.trim()) return;

    const cleanCode = code.trim().toUpperCase();
    const couponObj: Coupon = {
      code: cleanCode,
      discountType,
      amount: Number(amount),
      active: true,
      timesClaimed: 0,
      minSpend: Number(minSpend) || 0
    };

    try {
      await setDoc(doc(db, 'coupons', cleanCode), couponObj);
      showToast(`Coupon code ${cleanCode} saved!`);
      setIsCouponModalOpen(false);
      setCode('');
      fetchData();
    } catch (err) {
      console.error('Error saving coupon:', err);
      showToast('Failed to save coupon', 'error');
    }
  };

  const handleToggleCouponActive = async (c: Coupon) => {
    if (screenLocked) return;
    try {
      await updateDoc(doc(db, 'coupons', c.code), { active: !c.active });
      setCoupons(prev => prev.map(item => item.code === c.code ? { ...item, active: !item.active } : item));
      showToast(`Coupon ${c.code} status toggled`);
    } catch (err) {
      console.error('Error toggling coupon:', err);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (screenLocked) return;
    if (!window.confirm(`Delete coupon code ${code}?`)) return;
    try {
      await deleteDoc(doc(db, 'coupons', code));
      setCoupons(prev => prev.filter(c => c.code !== code));
      showToast(`Coupon ${code} deleted`);
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  const handleExportSubscribersCSV = () => {
    if (subscribers.length === 0) return;
    const headers = ['Email Address', 'Source Category', 'Subscribed At'];
    const rows = subscribers.map(s => [
      `"${s.email}"`,
      `"${s.source}"`,
      `"${new Date(s.subscribedAt).toLocaleString('en-AU')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cfy-cigarettes-launch-subscribers-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Subscribers CSV exported');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Promotions & Launch Signups
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Coupons</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'coupons' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('coupons')}
          >
            Discount Coupons ({coupons.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'subscribers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('subscribers')}
          >
            Cigarettes Launch List ({subscribers.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Coupons */}
      {activeTab === 'coupons' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
            <button
              className="btn btn-primary btn-sm"
              disabled={screenLocked}
              onClick={() => setIsCouponModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> Add Discount Coupon
            </button>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Code</th>
                    <th style={{ padding: '0.75rem' }}>Discount</th>
                    <th style={{ padding: '0.75rem' }}>Min Spend</th>
                    <th style={{ padding: '0.75rem' }}>Times Claimed</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No coupons generated yet. (Default demo codes WELCOME10 and CUBAN50 work at checkout).
                      </td>
                    </tr>
                  ) : (
                    coupons.map(c => (
                      <tr key={c.code} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                          {c.code}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                          {c.discountType === 'free_shipping' ? (
                            <span className="badge badge-gold">Waives Immediate Dispatch</span>
                          ) : c.discountType === 'percentage' ? (
                            `${c.amount}% OFF`
                          ) : (
                            `$${c.amount} AUD OFF`
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                          {(c.minSpend || c.minOrderAmount) ? `$${c.minSpend || c.minOrderAmount} AUD` : 'None ($0)'}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.timesClaimed || c.usedCount || 0} times
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            className={`badge ${c.active ? 'badge-green' : 'badge-red'}`}
                            disabled={screenLocked}
                            onClick={() => handleToggleCouponActive(c)}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {c.active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={screenLocked}
                            onClick={() => handleDeleteCoupon(c.code)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Email Subscribers */}
      {activeTab === 'subscribers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Customers who asked to be notified when a product range launches. The source column shows whether they signed up for cigars, cigarettes, or accessories.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleExportSubscribersCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={16} /> Export Subscribers CSV
            </button>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Email Address</th>
                    <th style={{ padding: '0.75rem' }}>Source</th>
                    <th style={{ padding: '0.75rem' }}>Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No email subscribers registered yet.
                      </td>
                    </tr>
                  ) : (
                    subscribers.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                          {s.email}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge badge-amber">{s.source}</span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(s.subscribedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {isCouponModalOpen && (
        <Modal>
          <div className="modal-content" style={{ maxWidth: '440px', position: 'relative' }}>
            <button
              onClick={() => setIsCouponModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Add Discount Coupon
            </h2>

            <form onSubmit={handleSaveCoupon}>
              <div className="form-group">
                <label className="form-label">Coupon Code</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. CUBAN20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Discount Type</label>
                  <select
                    className="form-control"
                    value={discountType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setDiscountType(newType);
                      if (newType === 'free_shipping') {
                        setAmount(0);
                      }
                    }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed AUD ($)</option>
                    <option value="free_shipping">Waives Immediate Dispatch</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    required
                    min={1}
                    disabled={discountType === 'free_shipping'}
                    className="form-control"
                    value={discountType === 'free_shipping' ? 0 : amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                  {discountType === 'free_shipping' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', display: 'block', marginTop: '0.25rem' }}>
                      Waives the Immediate Dispatch delivery fee. Express Delivery stays $12.
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Min Spend (AUD $)</label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  placeholder="0 (no minimum)"
                  value={minSpend}
                  onChange={(e) => setMinSpend(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsCouponModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked}>
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
