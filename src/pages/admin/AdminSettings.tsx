import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import type { UserProfile } from '../../types';
import { UserPlus, Trash2, Edit3, ShieldAlert, X, Mail, Send, CheckCircle, ShieldCheck, Users, Newspaper } from 'lucide-react';

type StaffKind = 'admin' | 'member' | 'marketing';

type StaffModalState =
  | { open: false }
  | { open: true; kind: StaffKind; editing: UserProfile | null };

const STAFF_LABELS: Record<StaffKind, { singular: string; plural: string; badge: string; description: string }> = {
  admin: {
    singular: 'administrator',
    plural: 'Administrators',
    badge: 'Administrator',
    description: 'Administrators only need an account type, name, and email.'
  },
  member: {
    singular: 'staff member',
    plural: 'Staff members',
    badge: 'Staff member',
    description: 'Staff members get orders and products access in the portal.'
  },
  marketing: {
    singular: 'marketing staff',
    plural: 'Marketing staff',
    badge: 'Marketing Staff',
    description: 'Marketing staff can only access and manage the News & SEO page.'
  }
};

export const AdminSettings: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [portalUsers, setPortalUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<StaffModalState>({ open: false });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sendingTestAdminEmail, setSendingTestAdminEmail] = useState(false);
  const [sendingTestCustomerEmail, setSendingTestCustomerEmail] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const u = { uid: d.id, ...d.data() } as UserProfile;
        if (u.role === 'admin' || u.role === 'member' || u.role === 'marketing') {
          list.push(u);
        }
      });
      list.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
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

  const admins = portalUsers.filter((u) => u.role === 'admin');
  const members = portalUsers.filter((u) => u.role === 'member');
  const marketingStaff = portalUsers.filter((u) => u.role === 'marketing');

  const openAdd = (kind: StaffKind) => {
    setModal({ open: true, kind, editing: null });
    setName('');
    setEmail('');
  };

  const openEdit = (u: UserProfile) => {
    const kind: StaffKind =
      u.role === 'admin' ? 'admin' : u.role === 'marketing' ? 'marketing' : 'member';
    setModal({ open: true, kind, editing: u });
    setName(u.displayName || '');
    setEmail(u.email);
  };

  const closeModal = () => setModal({ open: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenLocked || !modal.open) return;

    const kind = modal.kind;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      showToast('Name and email are required.', 'error');
      return;
    }

    try {
      if (modal.editing) {
        await updateDoc(doc(db, 'users', modal.editing.uid), {
          displayName: trimmedName,
          role: kind
        });
        showToast(`Updated ${STAFF_LABELS[kind].singular} ${trimmedEmail}`);
      } else {
        const uid = `user-${Math.random().toString(36).substring(2, 9)}`;
        const payload: Record<string, unknown> = {
          uid,
          email: trimmedEmail,
          displayName: trimmedName,
          role: kind,
          createdAt: new Date().toISOString()
        };
        // Members may later link to a full customer-style profile; admins/marketing stay lean.
        if (kind === 'member') {
          payload.addresses = [];
        }
        await setDoc(doc(db, 'users', uid), payload);
        showToast(
          `${STAFF_LABELS[kind].badge} record added for ${trimmedEmail}. They still need a matching Firebase Auth login to sign in.`
        );
      }
      closeModal();
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
    const label =
      u.role === 'admin'
        ? 'administrator'
        : u.role === 'marketing'
          ? 'marketing staff'
          : 'staff member';
    if (!window.confirm(`Remove ${label} access for ${u.email}?`)) return;

    try {
      await deleteDoc(doc(db, 'users', u.uid));
      setPortalUsers((prev) => prev.filter((item) => item.uid !== u.uid));
      showToast(`Removed ${u.email}`);
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('Failed to remove user', 'error');
    }
  };

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

  const renderStaffTable = (kind: StaffKind, rows: UserProfile[]) => {
    const emptyLabel = `No ${STAFF_LABELS[kind].singular} accounts yet.`;
    const badgeClass = kind === 'admin' ? 'badge-gold' : kind === 'marketing' ? 'badge-amber' : 'badge-gray';
    return (
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Name</th>
                <th style={{ padding: '0.75rem' }}>Email</th>
                <th style={{ padding: '0.75rem' }}>Account type</th>
                <th style={{ padding: '0.75rem' }}>Created</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '1.5rem 0.75rem', color: 'var(--text-muted)' }}>
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.uid} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {u.displayName || STAFF_LABELS[kind].badge}
                      {u.uid === currentUser?.uid && (
                        <span className="badge badge-gold" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>You</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-gold)' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${badgeClass}`} style={{ textTransform: 'uppercase' }}>
                        {kind === 'marketing' ? 'marketing' : kind}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-AU') : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>
                          <Edit3 size={14} />
                        </button>
                        {u.uid !== currentUser?.uid && (
                          <button
                            type="button"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Portal access
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Portal Settings & Staff</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0', maxWidth: '40rem', lineHeight: 1.5 }}>
            Administrators, staff members, and marketing staff are managed separately. Each account type only needs a name, email, and role.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Administrators</span>
          <h3 style={{ fontSize: '2rem', color: 'var(--accent-gold)' }}>{admins.length}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lean accounts — name, email, admin access</span>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Staff Members</span>
          <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{members.length}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Orders & products operational access</span>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Marketing Staff</span>
          <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{marketingStaff.length}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>News & SEO access only</span>
        </div>
      </div>

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

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff users...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--accent-gold)' }} />
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>Administrators</h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Core fields only: account type, name, and email. Full portal and settings access.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={screenLocked}
                onClick={() => openAdd('admin')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UserPlus size={16} /> Add administrator
              </button>
            </div>
            {renderStaffTable('admin', admins)}
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                  <Users size={18} style={{ color: 'var(--text-primary)' }} />
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>Staff members</h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Operational access to orders and products. Managed separately from administrator accounts.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={screenLocked}
                onClick={() => openAdd('member')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UserPlus size={16} /> Add staff member
              </button>
            </div>
            {renderStaffTable('member', members)}
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                  <Newspaper size={18} style={{ color: 'var(--text-primary)' }} />
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>Marketing staff</h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Limited access — can only view and manage the News & SEO page in the portal.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={screenLocked}
                onClick={() => openAdd('marketing')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UserPlus size={16} /> Add marketing staff
              </button>
            </div>
            {renderStaffTable('marketing', marketingStaff)}
          </section>
        </div>
      )}

      {modal.open && (
        <Modal>
          <div className="modal-content" style={{ maxWidth: '440px', position: 'relative' }}>
            <button
              type="button"
              onClick={closeModal}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {modal.editing
                ? `Edit ${STAFF_LABELS[modal.kind].singular}`
                : `Add ${STAFF_LABELS[modal.kind].singular}`}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {STAFF_LABELS[modal.kind].description}
            </p>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Account type</label>
                <input
                  type="text"
                  className="form-control"
                  value={STAFF_LABELS[modal.kind].badge}
                  disabled
                  readOnly
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder={
                    modal.kind === 'admin'
                      ? 'e.g. Alex Admin'
                      : modal.kind === 'marketing'
                        ? 'e.g. Jamie Marketing'
                        : 'e.g. Sarah Connor'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  required
                  disabled={!!modal.editing}
                  className="form-control"
                  placeholder="name@cigarsforyou.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked}>
                  {modal.editing
                    ? 'Save changes'
                    : `Add ${STAFF_LABELS[modal.kind].singular}`}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
