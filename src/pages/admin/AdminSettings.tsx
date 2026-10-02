import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import type { UserProfile, UserRole } from '../../types';
import { UserPlus, Trash2, Edit3, ShieldAlert, X, Mail, Send, CheckCircle } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [portalUsers, setPortalUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach(d => {
        const u = { uid: d.id, ...d.data() } as UserProfile;
        if (u.role === 'admin' || u.role === 'member') {
          list.push(u);
        }
      });
      setPortalUsers(list);
    } catch (err) {
      console.error('Error fetching portal users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Admin Role Access Guard Check
  if (!isAdmin) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 2rem', border: '2px solid var(--accent-ruby)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--accent-ruby)', margin: '0 auto 1rem auto' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Admin Access Required</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your account is assigned the <strong>Member</strong> role. Only Primary Administrators can manage portal users and settings.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('member');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setName(u.displayName || '');
    setEmail(u.email);
    setRole(u.role);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenLocked) return;

    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.uid), {
          displayName: name.trim(),
          role
        });
        showToast(`Updated user ${email}`);
      } else {
        const uid = `user-${Math.random().toString(36).substring(2, 9)}`;
        await setDoc(doc(db, 'users', uid), {
          uid,
          email: email.trim(),
          displayName: name.trim(),
          role,
          createdAt: new Date().toISOString(),
          dateOfBirth: '1990-01-01'
        });
        showToast(`Added new ${role} ${email}`);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error saving portal user:', err);
      showToast('Failed to save portal user', 'error');
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (screenLocked) return;
    if (u.uid === currentUser?.uid) {
      showToast('Cannot delete your own active administrator account', 'error');
      return;
    }
    if (!window.confirm(`Remove portal access for ${u.email}?`)) return;

    try {
      await deleteDoc(doc(db, 'users', u.uid));
      setPortalUsers(prev => prev.filter(item => item.uid !== u.uid));
      showToast(`Removed ${u.email}`);
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const [sendingTestAdminEmail, setSendingTestAdminEmail] = useState(false);
  const [sendingTestCustomerEmail, setSendingTestCustomerEmail] = useState(false);

  const handleSendTestAdminEmail = async () => {
    if (screenLocked) return;
    setSendingTestAdminEmail(true);
    try {
      const sendTestEmailFn = httpsCallable(functions, 'sendTestAdminEmail');
      const res: any = await sendTestEmailFn({ type: 'admin_test' });
      if (res.data?.success) {
        showToast('Admin notification alert sent successfully to staff via noreply@cigarsforyou.com.au!');
      } else {
        showToast(`Admin alert test complete (${res.data?.reason || res.data?.error || 'simulation mode'})`);
      }
    } catch (err: any) {
      console.error('Error triggering test admin email:', err);
      showToast(err.message || 'Failed to dispatch test admin email', 'error');
    } finally {
      setSendingTestAdminEmail(false);
    }
  };

  const handleSendTestCustomerEmail = async () => {
    if (screenLocked) return;
    const targetEmail = currentUser?.email || 'admin@cigarsforyou.com.au';
    setSendingTestCustomerEmail(true);
    try {
      const sendTestEmailFn = httpsCallable(functions, 'sendTestAdminEmail');
      const res: any = await sendTestEmailFn({ type: 'customer_sample', email: targetEmail });
      if (res.data?.success) {
        showToast(`Sample order receipt sent to ${targetEmail} via noreply@cigarsforyou.com.au!`);
      } else {
        showToast(`Customer confirmation test complete (${res.data?.reason || res.data?.error || 'simulation mode'})`);
      }
    } catch (err: any) {
      console.error('Error triggering test customer confirmation email:', err);
      showToast(err.message || 'Failed to dispatch test order receipt', 'error');
    } finally {
      setSendingTestCustomerEmail(false);
    }
  };

  const adminCount = portalUsers.filter(u => u.role === 'admin').length;
  const memberCount = portalUsers.filter(u => u.role === 'member').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Role-Based Access Control
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Portal Settings & Staff</h1>
        </div>

        <button
          className="btn btn-primary btn-sm"
          disabled={screenLocked}
          onClick={handleOpenAddModal}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <UserPlus size={16} /> Add Portal User
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Administrators</span>
          <h3 style={{ fontSize: '2rem', color: 'var(--accent-gold)' }}>{adminCount}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Full portal settings & staff access</span>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Staff Members</span>
          <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{memberCount}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Orders & products operational access</span>
        </div>
      </div>

      {/* Resend Email Integration Status Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Mail size={20} style={{ color: 'var(--accent-gold)' }} />
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
                Resend Automated Email Dispatch
              </h2>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Active & Configured</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', maxWidth: '650px' }}>
              Automated emails are handled via Resend from a single no-reply address:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>From</span>
                <code style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>noreply@cigarsforyou.com.au</code>
                <span style={{ color: 'var(--text-muted)' }}>→ Admin alerts & customer order confirmations</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-gray" style={{ fontSize: '0.7rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>Reply-To</span>
                <code style={{ color: '#10b981', fontSize: '0.85rem' }}>orders@cigarsforyou.com.au</code>
                <span style={{ color: 'var(--text-muted)' }}>→ Customer replies on order confirmation emails</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={sendingTestAdminEmail || screenLocked}
              onClick={handleSendTestAdminEmail}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%' }}
            >
              {sendingTestAdminEmail ? <CheckCircle size={14} className="animate-spin" /> : <Send size={14} />}
              {sendingTestAdminEmail ? 'Sending Alert...' : 'Test Admin Alert'}
            </button>
            <button
              className="btn btn-outline btn-sm"
              disabled={sendingTestCustomerEmail || screenLocked}
              onClick={handleSendTestCustomerEmail}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
            >
              {sendingTestCustomerEmail ? <CheckCircle size={14} className="animate-spin" /> : <Mail size={14} />}
              {sendingTestCustomerEmail ? 'Sending Receipt...' : 'Test Order Confirmation'}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff users...</div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Display Name</th>
                  <th style={{ padding: '0.75rem' }}>Email Address</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Created Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portalUsers.map(u => (
                  <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {u.displayName || 'Staff Member'}
                      {u.uid === currentUser?.uid && <span className="badge badge-gold" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>You</span>}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-gold)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-gold' : 'badge-gray'}`} style={{ textTransform: 'uppercase' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-AU') : 'System'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditModal(u)}
                        >
                          <Edit3 size={14} />
                        </button>
                        {u.uid !== currentUser?.uid && (
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={screenLocked}
                            onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', position: 'relative' }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              {editingUser ? 'Edit User Role' : 'Add Portal User'}
            </h2>

            <form onSubmit={handleSaveUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Sarah Connor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  className="form-control"
                  placeholder="staff@cigarsforyou.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Role</label>
                <select
                  className="form-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="member">Member (Orders & Products Access)</option>
                  <option value="admin">Administrator (Full Portal & Settings Access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked}>
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
