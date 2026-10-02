import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Award, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { db } from '../../firebase';
import type { RewardProduct } from '../../types';
import { useToast } from '../../components/Toast';
import { useAdminContext } from './AdminContext';

const emptyForm = {
  name: '',
  description: '',
  imageUrl: '',
  pointsCost: 100,
  stock: 0,
  active: true
};

export const AdminRewards: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RewardProduct | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rewardProducts'));
      const list: RewardProduct[] = [];
      snap.forEach((entry) => {
        list.push({ id: entry.id, ...entry.data() } as RewardProduct);
      });
      list.sort((a, b) => a.pointsCost - b.pointsCost || a.name.localeCompare(b.name));
      setProducts(list);
    } catch (err) {
      console.error('Error fetching reward products:', err);
      showToast('Failed to load reward products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'rewardProducts'));
        if (cancelled) return;
        const list: RewardProduct[] = [];
        snap.forEach((entry) => {
          list.push({ id: entry.id, ...entry.data() } as RewardProduct);
        });
        list.sort((a, b) => a.pointsCost - b.pointsCost || a.name.localeCompare(b.name));
        setProducts(list);
      } catch (err) {
        console.error('Error fetching reward products:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product: RewardProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      pointsCost: product.pointsCost,
      stock: product.stock,
      active: product.active
    });
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (screenLocked) return;

    const pointsCost = Math.floor(Number(form.pointsCost));
    const stock = Math.floor(Number(form.stock));
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!Number.isFinite(pointsCost) || pointsCost < 1) {
      showToast('Points price must be at least 1', 'error');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      showToast('Stock cannot be negative', 'error');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      pointsCost,
      stock,
      active: form.active
    };

    try {
      if (editing?.id) {
        await updateDoc(doc(db, 'rewardProducts', editing.id), payload);
        showToast(`Updated ${payload.name}`);
      } else {
        await addDoc(collection(db, 'rewardProducts'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        showToast(`Added ${payload.name} to the rewards shop`);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Error saving reward product:', err);
      showToast('Failed to save reward product', 'error');
    }
  };

  const handleInline = async (productId: string, field: 'stock' | 'pointsCost', value: number) => {
    if (screenLocked) return;
    const next = Math.floor(value);
    if (field === 'pointsCost' && next < 1) return;
    if (field === 'stock' && next < 0) return;
    try {
      await updateDoc(doc(db, 'rewardProducts', productId), { [field]: next });
      setProducts((prev) => prev.map((product) => product.id === productId ? { ...product, [field]: next } : product));
      showToast(`Updated ${field === 'pointsCost' ? 'points price' : 'stock'}`);
    } catch (err) {
      console.error('Inline reward update error:', err);
      showToast('Failed to update reward product', 'error');
    }
  };

  const handleDelete = async (product: RewardProduct) => {
    if (screenLocked || !product.id) return;
    if (!window.confirm(`Delete ${product.name} from the rewards shop?`)) return;
    try {
      await deleteDoc(doc(db, 'rewardProducts', product.id));
      setProducts((prev) => prev.filter((entry) => entry.id !== product.id));
      showToast(`Deleted ${product.name}`);
    } catch (err) {
      console.error('Error deleting reward product:', err);
      showToast('Failed to delete reward product', 'error');
    }
  };

  const filtered = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return product.name.toLowerCase().includes(query) || (product.description || '').toLowerCase().includes(query);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Award size={14} /> Marketing
          </span>
          <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>Rewards Program</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0', maxWidth: '640px' }}>
            Reward shop products are a separate catalog. Set the points price customers spend to claim each item.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} disabled={screenLocked} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Add reward
        </button>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search rewards..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reward products...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Award size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>No reward products yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Add a product and a points price to open the rewards shop.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Product</th>
                  <th style={{ padding: '0.75rem' }}>Points price</th>
                  <th style={{ padding: '0.75rem' }}>Stock</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                      <strong>{product.name}</strong>
                      {product.description && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem', maxWidth: '360px' }}>
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        style={{ width: '110px', padding: '0.35rem 0.6rem' }}
                        defaultValue={product.pointsCost}
                        disabled={screenLocked}
                        onBlur={(event) => product.id && handleInline(product.id, 'pointsCost', Number(event.target.value))}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        style={{ width: '90px', padding: '0.35rem 0.6rem' }}
                        defaultValue={product.stock}
                        disabled={screenLocked}
                        onBlur={(event) => product.id && handleInline(product.id, 'stock', Number(event.target.value))}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={product.active ? 'badge badge-green' : 'badge badge-amber'}>
                        {product.active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(product)} disabled={screenLocked} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(product)} disabled={screenLocked} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                {editing ? 'Edit reward' : 'Add reward'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label className="form-label">Name</label>
                <input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </div>
              <div>
                <label className="form-label">Image URL</label>
                <input className="form-control" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Points price</label>
                  <input type="number" min={1} className="form-control" value={form.pointsCost} onChange={(event) => setForm({ ...form, pointsCost: Number(event.target.value) })} required />
                </div>
                <div>
                  <label className="form-label">Stock</label>
                  <input type="number" min={0} className="form-control" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} required />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                Visible in the rewards shop
              </label>
              <button type="submit" className="btn btn-primary" disabled={screenLocked}>
                {editing ? 'Save changes' : 'Add reward'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
