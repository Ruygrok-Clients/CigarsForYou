import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CopyIconButton } from '../components/CopyIconButton';
import { getOrderStockIssue, resolveStockConflict, type StockIssue } from '../services/stockAllocation';

function money(value: number): string {
  return `$${value.toFixed(2)} AUD`;
}

export const OrderStockIssuePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const token = searchParams.get('token');
  const [issue, setIssue] = useState<StockIssue | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extraByLine, setExtraByLine] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!orderId) {
      setError('We could not find this order.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getOrderStockIssue({ orderId, token })
      .then((next) => {
        if (!cancelled) setIssue(next);
      })
      .catch(() => {
        if (!cancelled) setError('We could not open this order. Use the link from your checkout, or sign in to the account that placed it.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  const lines = issue?.items || [];
  const resolved = issue?.stockAllocationStatus === 'resolved';

  const refundPreview = useMemo(() => {
    if (!issue || resolved) return issue?.refundAmount || 0;
    const cancellingAll = lines.every((line) => {
      const shortfall = Math.max(0, line.quantity - line.allocatedQuantity);
      const extra = Math.min(line.allocatedQuantity, Math.max(0, extraByLine[line.lineIndex] || 0));
      return shortfall + extra >= line.quantity;
    });
    if (cancellingAll) return issue.totalAmount;
    const newSubtotal = lines.reduce((sum, line) => {
      const shortfall = Math.max(0, line.quantity - line.allocatedQuantity);
      const extra = Math.min(line.allocatedQuantity, Math.max(0, extraByLine[line.lineIndex] || 0));
      return sum + Math.max(0, line.quantity - shortfall - extra) * line.price;
    }, 0);
    const ratio = issue.subtotal > 0 ? newSubtotal / issue.subtotal : 0;
    const newDiscount = Math.min(newSubtotal, Math.round(issue.discountAmount * ratio * 100) / 100);
    const newTotal = Math.max(0, Math.round((newSubtotal - newDiscount + issue.shippingFee) * 100) / 100);
    return Math.max(0, Math.round((issue.totalAmount - newTotal) * 100) / 100);
  }, [issue, lines, extraByLine, resolved]);

  const submit = async (mode: 'full_cancel' | 'partial') => {
    if (!issue || saving) return;
    setSaving(true);
    setError('');
    try {
      const cancellations = mode === 'partial'
        ? lines.map((line) => {
          const shortfall = Math.max(0, line.quantity - line.allocatedQuantity);
          const extra = Math.min(line.allocatedQuantity, Math.max(0, extraByLine[line.lineIndex] || 0));
          return { lineIndex: line.lineIndex, productId: line.productId, quantity: shortfall + extra };
        })
        : undefined;
      const next = await resolveStockConflict({ orderId, token, mode, cancellations });
      setIssue(next);
    } catch {
      setError('We could not update the order. Please try again, or contact us and we will sort it out.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '3.5rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '720px' }}>
        <span className="badge badge-gold" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>Order update</span>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
          We had a problem with your order
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginTop: 0 }}>
          We're very sorry. There was an error on our end while allocating stock
          {issue?.orderNumber ? ` for order ${issue.orderNumber}` : ''}.
          This is our mistake, and we will put it right.
        </p>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading your order…</p>}
        {error && <p style={{ color: '#b91c1c', lineHeight: 1.5 }}>{error}</p>}

        {issue && (
          <>
            <div style={{ padding: '1.1rem 1.2rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.08)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.45rem', color: 'var(--text-primary)', fontWeight: 650 }}>
                $25 off your next order
              </p>
              <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)', lineHeight: 1.55, fontSize: '0.95rem' }}>
                Please take this as an apology for the inconvenience. The code is one-time use.
                It takes $25 off the total, and the total will not go below $0. Anything you don't use is not kept and does not roll over.
                We'll email this code to you as well.
              </p>
              {issue.apologyCouponCode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <strong style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                    {issue.apologyCouponCode}
                  </strong>
                  <CopyIconButton label="Discount code" value={issue.apologyCouponCode} />
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your code will appear here in a moment.</p>
              )}
            </div>

            {resolved ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {issue.stockConflictResolution === 'full_cancel'
                    ? `The whole order is cancelled. A refund of ${money(issue.refundAmount)} is recorded and our team will return the payment.`
                    : issue.status === 'Cancelled'
                      ? `Nothing from this order could be kept. A refund of ${money(issue.refundAmount)} is recorded.`
                      : `We've cancelled the items that couldn't be included${issue.refundAmount > 0 ? ` and recorded a refund of ${money(issue.refundAmount)}` : ''}. The rest of the order is still going ahead.`}
                </p>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  If you need a further change, contact us directly and we'll take care of it.
                </p>
                <Link to="/account?tab=orders" className="btn btn-primary">View orders</Link>
              </div>
            ) : issue.stockAllocationStatus === 'conflict' ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  You can cancel and refund the whole order, or choose which items to refund.
                  Quantities we couldn't include are already set to be cancelled, and those can't be put back on the order.
                  You can refund more if you'd like — there is no limit other than what you ordered.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  If you close this page, we'll cancel and refund only the quantities we couldn't include.
                  Contact us if you need that changed.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', margin: '1.25rem 0' }}>
                  {lines.map((line) => {
                    const shortfall = Math.max(0, line.quantity - line.allocatedQuantity);
                    const extraMax = line.allocatedQuantity;
                    const extra = Math.min(extraMax, Math.max(0, extraByLine[line.lineIndex] || 0));
                    return (
                      <div key={`${line.lineIndex}-${line.productId}`} style={{ padding: '0.9rem 0', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 650 }}>{line.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              {line.quantity} ordered · {money(line.price)} each
                            </div>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Refunding {shortfall + extra}
                          </div>
                        </div>
                        {shortfall > 0 && (
                          <label style={{ display: 'block', marginTop: '0.65rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Cancel and refund (required)
                            <input
                              type="number"
                              value={shortfall}
                              disabled
                              aria-label={`${line.name} required refund quantity`}
                              style={{ display: 'block', marginTop: '0.3rem', width: '6rem', opacity: 0.7 }}
                            />
                          </label>
                        )}
                        {extraMax > 0 && (
                          <label style={{ display: 'block', marginTop: '0.65rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Also refund
                            <input
                              type="number"
                              min={0}
                              max={extraMax}
                              value={extra}
                              disabled={saving}
                              aria-label={`${line.name} additional refund quantity`}
                              onChange={(event) => {
                                const next = Math.min(extraMax, Math.max(0, Math.floor(Number(event.target.value) || 0)));
                                setExtraByLine((prev) => ({ ...prev, [line.lineIndex]: next }));
                              }}
                              style={{ display: 'block', marginTop: '0.3rem', width: '6rem' }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Refund we'll record: {money(refundPreview)}. Shipping stays on the order unless everything is cancelled.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => submit('partial')}>
                    {saving ? 'Saving…' : 'Refund selected items'}
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => submit('full_cancel')}>
                    Cancel and refund the whole order
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>
                This order doesn't need a stock decision.
                {' '}
                <Link to="/account?tab=orders">View your orders</Link>.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
