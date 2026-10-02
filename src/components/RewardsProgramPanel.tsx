import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { Award, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useRewardsCart } from '../context/RewardsCartContext';
import { useToast } from './Toast';
import type { RewardProduct } from '../types';
import { spendablePoints } from '../utils/rewards';

type RewardsPanel = 'overview' | 'shop';

export const RewardsProgramPanel: React.FC<{ initialPanel?: RewardsPanel }> = ({ initialPanel = 'overview' }) => {
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const rewardsCart = useRewardsCart();
  const [panel, setPanel] = useState<RewardsPanel>(initialPanel);
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const balance = Number(userProfile?.rewardsPoints ?? 0);
  const spendable = spendablePoints(balance);

  useEffect(() => {
    refreshProfile();
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'rewardProducts'));
        if (cancelled) return;
        const list: RewardProduct[] = [];
        snap.forEach((entry) => {
          const product = { id: entry.id, ...entry.data() } as RewardProduct;
          if (product.active) list.push(product);
        });
        list.sort((a, b) => a.pointsCost - b.pointsCost || a.name.localeCompare(b.name));
        setProducts(list);
      } catch (err) {
        console.error('Error loading rewards shop:', err);
        if (!cancelled) showToast('Could not load the rewards shop.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Load the shop once when this tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = (product: RewardProduct) => {
    const added = rewardsCart.addItem(product, 1, spendable);
    if (!added) {
      showToast('Not enough points, or that reward is out of stock.', 'error');
      return;
    }
    showToast(`Added ${product.name} to your rewards checkout`);
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="badge badge-gold" style={{ marginBottom: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Award size={14} /> Rewards
        </span>
        <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0.2rem 0 0.4rem' }}>
          Rewards Program
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '640px', lineHeight: 1.6 }}>
          Earn 1 point for every whole dollar you spend on products after coupons, before shipping. Spend points in the rewards shop. Redeeming rewards does not earn more points.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${panel === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPanel('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`btn btn-sm ${panel === 'shop' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPanel('shop')}
        >
          Rewards Shop
        </button>
      </div>

      {panel === 'overview' && (
        <div className="card" style={{ padding: '2rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Available points
          </span>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1.1, margin: '0.35rem 0 0.75rem' }}>
            {spendable}
          </div>
          {balance < 0 && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
              Your balance is {balance} after points were taken back from a cancelled or refunded order. You can redeem again once it is above zero.
            </p>
          )}
          <div style={{ display: 'grid', gap: '0.85rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              A $1.99 order earns 1 point. A $0.50 order earns none. A $321.20 order earns 321 points. Shipping is not included.
            </p>
            <p style={{ margin: 0 }}>
              Points are added when an order is paid, and removed if that order is later cancelled or refunded.
            </p>
          </div>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setPanel('shop')}>
            Browse the rewards shop
          </button>
        </div>
      )}

      {panel === 'shop' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            {loading ? (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>Loading rewards...</div>
            ) : products.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <ShoppingBag size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.4rem' }}>The shop is empty</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Reward products will show up here once they are published.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {products.map((product) => {
                  const inCart = rewardsCart.items.find((item) => item.product.id === product.id)?.quantity || 0;
                  const outOfStock = product.stock <= 0;
                  return (
                    <div key={product.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ height: '140px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-primary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Award size={32} style={{ color: 'var(--accent-gold)' }} />
                        )}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{product.name}</h3>
                        {product.description && (
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{product.description}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <strong style={{ color: 'var(--accent-gold)' }}>{product.pointsCost} pts</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {outOfStock ? 'Out of stock' : `${product.stock} left`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={outOfStock || inCart >= product.stock}
                        onClick={() => handleAdd(product)}
                      >
                        {inCart > 0 ? `Add another (${inCart})` : 'Add to rewards'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '96px' }}>
            <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Rewards checkout</h3>
            <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {spendable} points available
            </p>
            {rewardsCart.items.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Add as many rewards as your points cover.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {rewardsCart.items.map((item) => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{item.product.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.product.pointsCost} pts each</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => rewardsCart.updateQuantity(item.product.id || '', item.quantity - 1, spendable)} aria-label="Decrease quantity">
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: '1.25rem', textAlign: 'center' }}>{item.quantity}</span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                        const ok = rewardsCart.updateQuantity(item.product.id || '', item.quantity + 1, spendable);
                        if (!ok) showToast('Not enough points for another one.', 'error');
                      }} aria-label="Increase quantity">
                        <Plus size={12} />
                      </button>
                      <button type="button" onClick={() => item.product.id && rewardsCart.removeItem(item.product.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <span>Points</span>
                  <span style={{ color: 'var(--accent-gold)' }}>{rewardsCart.pointsTotal}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={() => navigate('/checkout-details?mode=rewards')}
                >
                  Continue to delivery
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
