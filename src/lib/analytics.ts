import type { Product, RewardProduct } from '../types';

export const GA_MEASUREMENT_ID = 'G-SRZFLMB8X7';

const INTERNAL_COOKIE = 'cfy_ga_internal';
const DEBUG_COOKIE = 'cfy_ga_debug';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const VIEW_ITEM_LIST_LIMIT = 30;

type GtagArgs = [string, ...unknown[]];

declare global {
  interface Window {
    dataLayer?: GtagArgs[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type GaItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  item_list_id?: string;
  item_list_name?: string;
};

type EventParams = Record<string, unknown>;

const recentEvents = new Map<string, number>();

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function isInternalTraffic(): boolean {
  return readCookie(INTERNAL_COOKIE) === '1';
}

export function isDebugMode(): boolean {
  return readCookie(DEBUG_COOKIE) === '1';
}

/** Apply or clear staff flags from the query string. Returns a cleaned search string. */
export function consumeAnalyticsQueryFlags(search: string): { search: string; changed: boolean } {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  let changed = false;

  const internal = params.get('internal');
  if (internal === '1') {
    writeCookie(INTERNAL_COOKIE, '1');
    params.delete('internal');
    changed = true;
  } else if (internal === '0') {
    clearCookie(INTERNAL_COOKIE);
    params.delete('internal');
    changed = true;
  }

  const debug = params.get('ga_debug');
  if (debug === '1') {
    writeCookie(DEBUG_COOKIE, '1');
    params.delete('ga_debug');
    changed = true;
  } else if (debug === '0') {
    clearCookie(DEBUG_COOKIE);
    params.delete('ga_debug');
    changed = true;
  }

  const next = params.toString();
  return { search: next ? `?${next}` : '', changed };
}

function money(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

function withContext(params: EventParams = {}): EventParams {
  const next: EventParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') next[key] = value;
  }
  if (isInternalTraffic()) next.traffic_type = 'internal';
  if (isDebugMode()) next.debug_mode = true;
  next.send_to = GA_MEASUREMENT_ID;
  return next;
}

export function trackEvent(name: string, params: EventParams = {}) {
  gtag('event', name, withContext(params));
}

/** Collapse Strict Mode's double effect invocation without blocking real later events. */
export function trackOnce(dedupeKey: string, name: string, params: EventParams = {}, windowMs = 1000) {
  const now = Date.now();
  const previous = recentEvents.get(dedupeKey) ?? 0;
  if (now - previous < windowMs) return;
  recentEvents.set(dedupeKey, now);
  trackEvent(name, params);
}

export function trackPageView(pagePath: string) {
  const path = pagePath || '/';
  trackOnce(`page:${path}`, 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title
  });
}

export function toGaItem(
  product: Pick<Product, 'id' | 'slug' | 'name' | 'brand' | 'category' | 'price'>,
  quantity = 1,
  extras: Partial<GaItem> = {}
): GaItem {
  return {
    item_id: product.id || product.slug,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category || 'cigars',
    price: money(extras.price ?? product.price),
    quantity,
    item_list_id: extras.item_list_id,
    item_list_name: extras.item_list_name
  };
}

export function toRewardGaItem(product: RewardProduct, quantity = 1): GaItem {
  return {
    item_id: product.id || product.name,
    item_name: product.name,
    item_category: 'rewards',
    price: 0,
    quantity
  };
}

export function couponLabel(codes: string[]): string | undefined {
  const clean = codes.map((code) => code.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join(',') : undefined;
}

export function trackViewItemList(itemListId: string, itemListName: string, products: Product[]) {
  const items = products.slice(0, VIEW_ITEM_LIST_LIMIT).map((product) =>
    toGaItem(product, 1, { item_list_id: itemListId, item_list_name: itemListName })
  );
  if (items.length === 0) return;
  trackOnce(`list:${itemListId}:${itemListName}:${items.map((item) => item.item_id).join(',')}`, 'view_item_list', {
    item_list_id: itemListId,
    item_list_name: itemListName,
    items
  });
}

export function trackSelectItem(product: Product, itemListId?: string, itemListName?: string) {
  trackEvent('select_item', {
    item_list_id: itemListId,
    item_list_name: itemListName,
    items: [toGaItem(product, 1, { item_list_id: itemListId, item_list_name: itemListName })]
  });
}

export function trackViewItem(product: Product) {
  const item = toGaItem(product, 1);
  trackOnce(`view_item:${item.item_id}`, 'view_item', {
    currency: 'AUD',
    value: item.price,
    items: [item]
  });
}

export function trackAddToCart(product: Product, quantity: number, unitPrice?: number, coupon?: string) {
  const qty = Math.max(1, quantity);
  const price = money(unitPrice ?? product.price);
  trackEvent('add_to_cart', {
    currency: 'AUD',
    value: money(price * qty),
    coupon,
    items: [toGaItem(product, qty, { price })]
  });
}

export function trackRemoveFromCart(product: Product, quantity: number, unitPrice?: number, coupon?: string) {
  const qty = Math.max(1, quantity);
  const price = money(unitPrice ?? product.price);
  trackEvent('remove_from_cart', {
    currency: 'AUD',
    value: money(price * qty),
    coupon,
    items: [toGaItem(product, qty, { price })]
  });
}

export function trackViewCart(value: number, items: GaItem[], coupon?: string) {
  trackOnce(`view_cart:${items.map((item) => `${item.item_id}:${item.quantity}`).join(',')}:${value}`, 'view_cart', {
    currency: 'AUD',
    value: money(value),
    coupon,
    items
  });
}

export function trackBeginCheckout(value: number, items: GaItem[], coupon?: string, checkoutType?: string) {
  trackOnce(`begin_checkout:${checkoutType || 'paid'}:${items.map((item) => item.item_id).join(',')}`, 'begin_checkout', {
    currency: 'AUD',
    value: money(value),
    coupon,
    checkout_type: checkoutType,
    items
  });
}

export function trackAddShippingInfo(value: number, shippingTier: string, items: GaItem[], coupon?: string, checkoutType?: string) {
  trackEvent('add_shipping_info', {
    currency: 'AUD',
    value: money(value),
    shipping_tier: shippingTier,
    coupon,
    checkout_type: checkoutType,
    items
  });
}

export function trackAddPaymentInfo(value: number, paymentType: string, items: GaItem[], coupon?: string, checkoutType?: string) {
  trackOnce(`add_payment_info:${checkoutType || paymentType}:${items.map((item) => item.item_id).join(',')}`, 'add_payment_info', {
    currency: 'AUD',
    value: money(value),
    payment_type: paymentType,
    coupon,
    checkout_type: checkoutType,
    items
  });
}

/**
 * Fire once on a successful order, before navigation to confirmation.
 * Paid checkout should call this with the AUD order total when payments go live.
 * Rewards orders pass shipping as `value` (points are not revenue) and `checkout_type: 'rewards'`.
 */
/** Paid product checkout should call this once on success when payments are enabled. */
export function trackPaidPurchase(input: Omit<Parameters<typeof trackPurchase>[0], 'checkoutType'>) {
  trackPurchase({ ...input, checkoutType: 'paid' });
}

export function trackPurchase(input: {
  transactionId: string;
  value: number;
  shipping?: number;
  coupon?: string;
  items: GaItem[];
  checkoutType: 'paid' | 'rewards';
  pointsRedeemed?: number;
}) {
  if (!input.transactionId) return;
  trackOnce(`purchase:${input.transactionId}`, 'purchase', {
    transaction_id: input.transactionId,
    currency: 'AUD',
    value: money(input.value),
    shipping: money(input.shipping ?? 0),
    coupon: input.coupon,
    checkout_type: input.checkoutType,
    points_redeemed: input.pointsRedeemed,
    items: input.items
  });
}

export function trackViewPromotion(promotionId: string, promotionName: string, creativeName?: string) {
  trackOnce(`view_promotion:${promotionId}:${creativeName || ''}`, 'view_promotion', {
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_name: creativeName
  });
}

export function trackSelectPromotion(promotionId: string, promotionName: string, creativeSlot: string) {
  trackEvent('select_promotion', {
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_slot: creativeSlot
  });
}

const recentSearches = new Map<string, number>();

export function trackSearch(searchTerm: string, source: string) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return;
  const key = `${source}:${term}`;
  const now = Date.now();
  const previous = recentSearches.get(term) ?? 0;
  if (now - previous < 2000) return;
  recentSearches.set(term, now);
  recentSearches.set(key, now);
  trackEvent('search', {
    search_term: term,
    search_source: source
  });
}

export function trackCta(ctaId: string) {
  trackEvent('cta_click', { cta_id: ctaId });
}

export function bindDocumentClicks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (window.location.pathname.startsWith('/admin')) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    if (href.startsWith('tel:')) {
      trackEvent('click_to_call', { link_url: href });
      return;
    }
    if (href.startsWith('mailto:')) {
      trackEvent('click_email', { link_url: href.split('?')[0] });
      return;
    }

    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== window.location.origin) {
      trackEvent('outbound_click', {
        link_url: url.href,
        link_domain: url.hostname
      });
    }
  };

  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
