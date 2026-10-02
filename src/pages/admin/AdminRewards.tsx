import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { Award, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { db } from '../../firebase';
import type { LoyaltyTier, RewardProduct } from '../../types';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useAdminContext } from './AdminContext';
import {
  DEFAULT_GOLD_THRESHOLD,
  DEFAULT_SILVER_THRESHOLD,
  resolveMinTier,
  resolvePointsCostByTier,
  tierLabel
} from '../../utils/rewards';

const emptyForm = {
  name: '',
  description: '',
  imageUrl: '',
  minTier: 'bronze' as LoyaltyTier,
  bronzeCost: 100,
  silverCost: 100,
  goldCost: 100,
  stock: 0,
  active: true
};

function sortProducts(list: RewardProduct[]): RewardProduct[] {
  return [...list].sort((a, b) => {
    const costDiff = resolvePointsCostByTier(a).bronze - resolvePointsCostByTier(b).bronze;
    return costDiff || a.name.localeCompare(b.name);
  });
}

export const AdminRewards: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RewardProduct | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [silverThreshold, setSilverThreshold] = useState(DEFAULT_SILVER_THRESHOLD);
  const [goldThreshold, setGoldThreshold] = useState(DEFAULT_GOLD_THRESHOLD);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rewardProducts'));
      const list: RewardProduct[] = [];
      snap.forEach((entry) => {
        list.push({ id: entry.id, ...entry.data() } as RewardProduct);
      });
      setProducts(sortProducts(list));
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
        const [productSnap, settingsSnap] = await Promise.all([
          getDocs(collection(db, 'rewardProducts')),
          getDoc(doc(db, 'settings', 'rewards'))
        ]);
        if (cancelled) return;
        const list: RewardProduct[] = [];
        productSnap.forEach((entry) => {
          list.push({ id: entry.id, ...entry.data() } as RewardProduct);
        });
        setProducts(sortProducts(list));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          const silver = Math.floor(Number(data.silverThreshold));
          const gold = Math.floor(Number(data.goldThreshold));
          if (Number.isFinite(silver) && silver >= 1) setSilverThreshold(silver);
          if (Number.isFinite(gold) && gold > silver) setGoldThreshold(gold);
        }
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

  const saveThresholds = async (event: React.FormEvent) => {
    event.preventDefault();
    if (screenLocked) return;
    const silver = Math.floor(Number(silverThreshold));
    const gold = Math.floor(Number(goldThreshold));
    if (!Number.isFinite(silver) || silver < 1) {
      showToast('Silver threshold must be at least 1', 'error');
      return;
    }
    if (!Number.isFinite(gold) || gold <= silver) {
      showToast('Gold threshold must be higher than Silver', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'rewards'), {
        silverThreshold: silver,
        goldThreshold: gold,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.uid || ''
      }, { merge: true });
      showToast('Saved tier thresholds');
    } catch (err) {
      console.error('Error saving reward settings:', err);
      showToast('Failed to save tier thresholds', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product: RewardProduct) => {
    const costs = resolvePointsCostByTier(product);
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      minTier: resolveMinTier(product),
      bronzeCost: costs.bronze,
      silverCost: costs.silver,
      goldCost: costs.gold,
      stock: product.stock,
      active: product.active
    });
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (screenLocked) return;

    const bronzeCost = Math.floor(Number(form.bronzeCost));
    const silverCost = Math.floor(Number(form.silverCost));
    const goldCost = Math.floor(Number(form.goldCost));
    const stock = Math.floor(Number(form.stock));
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (![bronzeCost, silverCost, goldCost].every((cost) => Number.isFinite(cost) && cost >= 1)) {
      showToast('Each tier price must be at least 1 point', 'error');
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
      minTier: form.minTier,
      pointsCostByTier: { bronze: bronzeCost, silver: silverCost, gold: goldCost },
      pointsCost: bronzeCost,
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
        showToast(`Added ${payload.name} to the loyalty shop`);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Error saving reward product:', err);
      showToast('Failed to save reward product', 'error');
    }
  };

  const handleStock = async (productId: string, value: number) => {
    if (screenLocked) return;
    const next = Math.floor(value);
    if (next < 0) return;
    try {
      await updateDoc(doc(db, 'rewardProducts', productId), { stock: next });
      setProducts((prev) => prev.map((product) => product.id === productId ? { ...product, stock: next } : product));
      showToast('Updated stock');
    } catch (err) {
      console.error('Inline reward update error:', err);
      showToast('Failed to update reward product', 'error');
    }
  };

  const handleTierCost = async (product: RewardProduct, tier: LoyaltyTier, value: number) => {
    if (screenLocked || !product.id) return;
    const next = Math.floor(value);
    if (!Number.isFinite(next) || next < 1) return;
    const costs = { ...resolvePointsCostByTier(product), [tier]: next };
    try {
      await updateDoc(doc(db, 'rewardProducts', product.id), {
        pointsCostByTier: costs,
        pointsCost: costs.bronze,
        minTier: resolveMinTier(product)
      });
      setProducts((prev) => prev.map((entry) => entry.id === product.id
        ? { ...entry, pointsCostByTier: costs, pointsCost: costs.bronze, minTier: resolveMinTier(product) }
        : entry));
      showToast(`Updated ${tierLabel(tier)} price`);
    } catch (err) {
      console.error('Inline reward price error:', err);
      showToast('Failed to update reward product', 'error');
    }
  };

  const handleMinTier = async (product: RewardProduct, minTier: LoyaltyTier) => {
    if (screenLocked || !product.id || resolveMinTier(product) === minTier) return;
    try {
      await updateDoc(doc(db, 'rewardProducts', product.id), { minTier });
      setProducts((prev) => prev.map((entry) => entry.id === product.id ? { ...entry, minTier } : entry));
      showToast(`Minimum tier set to ${tierLabel(minTier)}`);
    } catch (err) {
      console.error('Inline reward tier error:', err);
      showToast('Failed to update reward product', 'error');
    }
  };

  const handleDelete = async (product: RewardProduct) => {
    if (screenLocked || !product.id) return;
    if (!window.confirm(`Delete ${product.name} from the loyalty shop?`)) return;
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
          <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>Loyalty Program</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0', maxWidth: '640px' }}>
            Set the monthly rolling thresholds for Silver and Gold, then choose which tier can redeem each reward and what it costs at each tier.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} disabled={screenLocked} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Add reward
        </button>
      </div>

      <form className="card" onSubmit={saveThresholds} style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', color: 'var(--text-primary)' }}>Tier thresholds</h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '720px', lineHeight: 1.5 }}>
          Points earned from purchases in any rolling 30 days. Bronze is the starting tier and has no threshold. Members can jump up more than one tier, and only drop one tier at a time.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Silver (points / 30 days)</label>
            <input
              type="number"
              min={1}
              className="form-control"
              style={{ width: '180px' }}
              value={silverThreshold}
              disabled={screenLocked}
              onChange={(event) => setSilverThreshold(Number(event.target.value))}
            />
          </div>
          <div>
            <label className="form-label">Gold (points / 30 days)</label>
            <input
              type="number"
              min={2}
              className="form-control"
              style={{ width: '180px' }}
              value={goldThreshold}
              disabled={screenLocked}
              onChange={(event) => setGoldThreshold(Number(event.target.value))}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={screenLocked || savingSettings}>
            {savingSettings ? 'Saving...' : 'Save thresholds'}
          </button>
        </div>
      </form>

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
          <p style={{ color: 'var(--text-secondary)' }}>Add a product, a minimum tier, and a points price for each tier.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Product</th>
                  <th style={{ padding: '0.75rem' }}>Minimum tier</th>
                  <th style={{ padding: '0.75rem' }}>Bronze</th>
                  <th style={{ padding: '0.75rem' }}>Silver</th>
                  <th style={{ padding: '0.75rem' }}>Gold</th>
                  <th style={{ padding: '0.75rem' }}>Stock</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const costs = resolvePointsCostByTier(product);
                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                        <strong>{product.name}</strong>
                        {product.description && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem', maxWidth: '280px' }}>
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          className="form-control"
                          style={{ width: '120px', padding: '0.35rem 0.6rem' }}
                          value={resolveMinTier(product)}
                          disabled={screenLocked}
                          onChange={(event) => handleMinTier(product, event.target.value as LoyaltyTier)}
                        >
                          <option value="bronze">Bronze</option>
                          <option value="silver">Silver</option>
                          <option value="gold">Gold</option>
                        </select>
                      </td>
                      {(['bronze', 'silver', 'gold'] as LoyaltyTier[]).map((tier) => (
                        <td key={tier} style={{ padding: '0.75rem' }}>
                          <input
                            type="number"
                            min={1}
                            className="form-control"
                            style={{ width: '90px', padding: '0.35rem 0.6rem' }}
                            defaultValue={costs[tier]}
                            disabled={screenLocked}
                            onBlur={(event) => handleTierCost(product, tier, Number(event.target.value))}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          style={{ width: '90px', padding: '0.35rem 0.6rem' }}
                          defaultValue={product.stock}
                          disabled={screenLocked}
                          onBlur={(event) => product.id && handleStock(product.id, Number(event.target.value))}
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
                  );
                })}
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
              <div>
                <label className="form-label">Minimum tier</label>
                <select className="form-control" value={form.minTier} onChange={(event) => setForm({ ...form, minTier: event.target.value as LoyaltyTier })}>
                  <option value="bronze">Bronze and above</option>
                  <option value="silver">Silver and above</option>
                  <option value="gold">Gold only</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Bronze points</label>
                  <input type="number" min={1} className="form-control" value={form.bronzeCost} onChange={(event) => setForm({ ...form, bronzeCost: Number(event.target.value) })} required />
                </div>
                <div>
                  <label className="form-label">Silver points</label>
                  <input type="number" min={1} className="form-control" value={form.silverCost} onChange={(event) => setForm({ ...form, silverCost: Number(event.target.value) })} required />
                </div>
                <div>
                  <label className="form-label">Gold points</label>
                  <input type="number" min={1} className="form-control" value={form.goldCost} onChange={(event) => setForm({ ...form, goldCost: Number(event.target.value) })} required />
                </div>
              </div>
              <div>
                <label className="form-label">Stock</label>
                <input type="number" min={0} className="form-control" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} required />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                Visible in the loyalty shop
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
