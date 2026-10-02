import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Award, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useRewardsCart } from '../context/RewardsCartContext';
import { useToast } from './Toast';
import type { RewardProduct, RewardsLedgerEntry } from '../types';
import {
  DEFAULT_GOLD_THRESHOLD,
  DEFAULT_SILVER_THRESHOLD,
  loyaltyStatusLines,
  normalizeLoyaltyTier,
  productVisibleForTier,
  resolveProductPointsCost,
  rollingEarnPoints,
  spendablePoints,
  tierLabel
} from '../utils/rewards';

type RewardsPanel = 'overview' | 'shop';

export const RewardsProgramPanel: React.FC<{ initialPanel?: RewardsPanel }> = ({ initialPanel = 'overview' }) => {
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const rewardsCart = useRewardsCart();
  const [panel, setPanel] = useState<RewardsPanel>(initialPanel);
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [silverThreshold, setSilverThreshold] = useState(DEFAULT_SILVER_THRESHOLD);
  const [goldThreshold, setGoldThreshold] = useState(DEFAULT_GOLD_THRESHOLD);
  const [windowPoints, setWindowPoints] = useState(userProfile?.loyaltyWindowPoints ?? 0);

  const balance = Number(userProfile?.rewardsPoints ?? 0);
  const spendable = spendablePoints(balance);
  const tier = normalizeLoyaltyTier(userProfile?.loyaltyTier);
  const tierBadge = tier === 'gold' ? 'badge-gold' : tier === 'silver' ? 'badge-gray' : 'badge-orange';

  useEffect(() => {
    refreshProfile();
    let cancelled = false;
    (async () => {
      try {
        const productSnap = await getDocs(collection(db, 'rewardProducts'));
        if (cancelled) return;
        const list: RewardProduct[] = [];
        productSnap.forEach((entry) => {
          const product = { id: entry.id, ...entry.data() } as RewardProduct;
          if (product.active) list.push(product);
        });
        list.sort((a, b) => resolveProductPointsCost(a, tier) - resolveProductPointsCost(b, tier) || a.name.localeCompare(b.name));
        setProducts(list);
      } catch (err) {
        console.error('Error loading rewards shop:', err);
        if (!cancelled) showToast('Could not load the loyalty shop.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'rewards'));
        if (cancelled || !settingsSnap.exists()) return;
        const data = settingsSnap.data();
        const silver = Math.floor(Number(data.silverThreshold));
        const gold = Math.floor(Number(data.goldThreshold));
        if (Number.isFinite(silver) && silver >= 1) setSilverThreshold(silver);
        if (Number.isFinite(gold) && gold > silver) setGoldThreshold(gold);
      } catch (err) {
        console.error('Error loading reward thresholds:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reload when the signed-in customer is known. refreshProfile identity is stable enough for this tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]);

  useEffect(() => {
    const uid = userProfile?.uid;
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const ledgerSnap = await getDocs(query(
          collection(db, 'rewardsLedger'),
          where('userId', '==', uid),
          where('createdAt', '>=', cutoff)
        ));
        const ledgerEntries: RewardsLedgerEntry[] = [];
        ledgerSnap.forEach((entry) => {
          ledgerEntries.push({ id: entry.id, ...entry.data() } as RewardsLedgerEntry);
        });
        if (!cancelled) setWindowPoints(rollingEarnPoints(ledgerEntries));
      } catch (err) {
        console.error('Error loading loyalty window:', err);
        if (!cancelled) setWindowPoints(Number(userProfile?.loyaltyWindowPoints ?? 0));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userProfile?.uid, userProfile?.loyaltyWindowPoints]);

  const handleAdd = (product: RewardProduct) => {
    const added = rewardsCart.addItem(product, 1, spendable);
    if (!added) {
      showToast('Not enough points, or that reward is out of stock.', 'error');
      return;
    }
    showToast(`Added ${product.name} to your loyalty checkout`);
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0 0 0.4rem' }}>
          Loyalty Program
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '640px', lineHeight: 1.6 }}>
          Earn 1 point for every whole dollar you spend on products after coupons, before shipping. Your tier is based on points earned in the last 30 days. Higher tiers unlock more rewards and lower point prices. Redeeming rewards does not change your tier.
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
          Loyalty Shop
        </button>
      </div>

      {panel === 'overview' && (
        <div className="card" style={{ padding: '2rem' }}>
          <span className={`badge ${tierBadge}`} style={{ marginBottom: '0.85rem' }}>{tierLabel(tier)}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block' }}>
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
            {loyaltyStatusLines(tier, windowPoints, silverThreshold, goldThreshold).map((line) => (
              <p key={line} style={{ margin: 0 }}>{line}</p>
            ))}
            <p style={{ margin: 0 }}>
              A $1.99 order earns 1 point. A $0.50 order earns none. A $321.20 order earns 321 points. Shipping is not included.
            </p>
            <p style={{ margin: 0 }}>
              Points are added when an order is paid, and removed if that order is later cancelled or refunded. Everyone starts at Bronze.
            </p>
          </div>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setPanel('shop')}>
            Browse the loyalty shop
          </button>
        </div>
      )}

      {panel === 'shop' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            {loading ? (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>Loading rewards...</div>
            ) : products.filter((product) => productVisibleForTier(product, tier)).length === 0 ? (
              <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <ShoppingBag size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  {products.length === 0 ? 'The shop is empty' : 'No rewards for your tier yet'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  {products.length === 0
                    ? 'Reward products will show up here once they are published.'
                    : 'Higher tiers unlock more rewards. Keep earning points to move up.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {products.filter((product) => productVisibleForTier(product, tier)).map((product) => {
                  const price = resolveProductPointsCost(product, tier);
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
                        <strong style={{ color: 'var(--accent-gold)' }}>{price} pts</strong>
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
                        {inCart > 0 ? `Add another (${inCart})` : 'Add to loyalty'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '96px' }}>
            <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Loyalty checkout</h3>
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
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{resolveProductPointsCost(item.product, tier)} pts each</div>
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
