import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { B2BEnquiry, Enquiry } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { CheckCircle2, Mail, Search } from 'lucide-react';

type Tab = 'customers' | 'b2b';
type StatusFilter = 'all' | 'new' | 'reviewed';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const AdminEnquiries: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>('customers');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [b2bEnquiries, setB2bEnquiries] = useState<B2BEnquiry[]>([]);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const [customerSnap, b2bSnap] = await Promise.all([
        getDocs(collection(db, 'enquiries')),
        getDocs(collection(db, 'b2bEnquiries'))
      ]);

      const customerList: Enquiry[] = [];
      customerSnap.forEach((d) => customerList.push({ id: d.id, ...d.data() } as Enquiry));
      customerList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const b2bList: B2BEnquiry[] = [];
      b2bSnap.forEach((d) => b2bList.push({ id: d.id, ...d.data() } as B2BEnquiry));
      b2bList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setEnquiries(customerList);
      setB2bEnquiries(b2bList);
    } catch (err) {
      console.error('Error fetching enquiries:', err);
      showToast('Could not load enquiries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const markReviewed = async (collectionName: 'enquiries' | 'b2bEnquiries', id: string) => {
    if (screenLocked || !id) return;
    try {
      await updateDoc(doc(db, collectionName, id), { status: 'reviewed' });
      if (collectionName === 'enquiries') {
        setEnquiries((prev) => prev.map((item) => item.id === id ? { ...item, status: 'reviewed' } : item));
      } else {
        setB2bEnquiries((prev) => prev.map((item) => item.id === id ? { ...item, status: 'reviewed' } : item));
      }
      showToast('Marked as reviewed');
    } catch (err) {
      console.error('Error updating enquiry status:', err);
      showToast('Could not update enquiry', 'error');
    }
  };

  const matchesStatus = (status?: string) => {
    if (statusFilter === 'all') return true;
    const current = status === 'reviewed' ? 'reviewed' : 'new';
    return current === statusFilter;
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredCustomers = enquiries.filter((item) => {
    if (!matchesStatus(item.status)) return false;
    if (!query) return true;
    return [item.name, item.email, item.phone, item.subject, item.message]
      .some((value) => (value || '').toLowerCase().includes(query));
  });

  const filteredB2B = b2bEnquiries.filter((item) => {
    if (!matchesStatus(item.status)) return false;
    if (!query) return true;
    return [item.name, item.businessName, item.email, item.phone, item.abn, item.interest, item.message]
      .some((value) => (value || '').toLowerCase().includes(query));
  });

  const activeCount = tab === 'customers' ? enquiries.length : b2bEnquiries.length;
  const newCount = (tab === 'customers' ? enquiries : b2bEnquiries).filter((item) => item.status !== 'reviewed').length;
  const reviewedCount = activeCount - newCount;
  const visible = tab === 'customers' ? filteredCustomers : filteredB2B;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
          Marketing
        </span>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Enquiries</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn btn-sm ${tab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('customers')}
        >
          Customers ({enquiries.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'b2b' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('b2b')}
        >
          B2B ({b2bEnquiries.length})
        </button>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder={tab === 'customers' ? 'Search name, email, or topic...' : 'Search business, email, or interest...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${statusFilter === 'new' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('new')}
            >
              New ({newCount})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'reviewed' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('reviewed')}
            >
              Reviewed ({reviewedCount})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({activeCount})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading enquiries...</div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Mail size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            {tab === 'customers' ? 'No customer enquiries found' : 'No B2B enquiries found'}
          </h3>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            {tab === 'customers' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Contact</th>
                    <th style={{ padding: '0.75rem' }}>Topic</th>
                    <th style={{ padding: '0.75rem' }}>Message</th>
                    <th style={{ padding: '0.75rem' }}>Received</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ color: 'var(--accent-gold)' }}>{item.email}</div>
                        {item.phone ? <div style={{ color: 'var(--text-muted)' }}>{item.phone}</div> : null}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.subject}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', maxWidth: '320px', whiteSpace: 'pre-wrap' }}>{item.message}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {item.status === 'reviewed' ? (
                          <span className="badge badge-green">Reviewed</span>
                        ) : (
                          <span className="badge badge-amber">New</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {item.status !== 'reviewed' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={screenLocked}
                            onClick={() => markReviewed('enquiries', item.id!)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <CheckCircle2 size={14} /> Mark reviewed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Business</th>
                    <th style={{ padding: '0.75rem' }}>Interest</th>
                    <th style={{ padding: '0.75rem' }}>Message</th>
                    <th style={{ padding: '0.75rem' }}>Received</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredB2B.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: 600 }}>{item.businessName}</div>
                        <div>{item.name}</div>
                        <div style={{ color: 'var(--accent-gold)' }}>{item.email}</div>
                        {item.phone ? <div style={{ color: 'var(--text-muted)' }}>{item.phone}</div> : null}
                        {item.abn ? <div style={{ color: 'var(--text-muted)' }}>ABN {item.abn}</div> : null}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-gold">{item.interest}</span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', maxWidth: '320px', whiteSpace: 'pre-wrap' }}>{item.message}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {item.status === 'reviewed' ? (
                          <span className="badge badge-green">Reviewed</span>
                        ) : (
                          <span className="badge badge-amber">New</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {item.status !== 'reviewed' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={screenLocked}
                            onClick={() => markReviewed('b2bEnquiries', item.id!)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <CheckCircle2 size={14} /> Mark reviewed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
