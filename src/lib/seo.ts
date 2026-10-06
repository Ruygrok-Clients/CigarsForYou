import { brandCatalogueCopy } from '../constants/productRanges';
import type { ProductRange, ProductSpecification } from '../types';

export const SITE_ORIGIN = 'https://cigarsforyou.com.au';

export const DEFAULT_TITLE = 'CigarsForYou — Premium Cuban Cigars & Subscription Delivery';

export type RobotsDirective = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';

export interface SeoState {
  title?: string;
  robots?: RobotsDirective;
  /** Absolute URL, or null to remove the tag. */
  canonical?: string | null;
  /** Meta description, or null to remove the tag. */
  description?: string | null;
}

/** Apex HTTPS path with no trailing slash (except `/`) and no query string. */
export function canonicalPath(pathname: string): string {
  const bare = (pathname || '/').split('?')[0].split('#')[0] || '/';
  const withSlash = bare.startsWith('/') ? bare : `/${bare}`;
  if (withSlash !== '/' && withSlash.endsWith('/')) return withSlash.slice(0, -1) || '/';
  return withSlash || '/';
}

export function absoluteCanonical(pathname: string): string {
  const path = canonicalPath(pathname);
  return path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

function upsertMeta(name: string, content: string | null) {
  const selector = `meta[name="${name}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string | null) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Collapse whitespace and cap a meta description near a search-snippet length. */
export function clampMetaDescription(value: string, max = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\s]+$/, '');
  return `${base}…`;
}

export function applySeo(state: SeoState) {
  if (state.title) document.title = state.title;
  if (state.robots) upsertMeta('robots', state.robots);
  if (state.canonical !== undefined) upsertCanonical(state.canonical);
  if (state.description !== undefined) {
    upsertMeta('description', state.description ? clampMetaDescription(state.description) : null);
  }
}

export function productTitle(brand: string | undefined, name: string | undefined): string {
  const cleanName = (name || '').trim();
  const cleanBrand = (brand || '').trim();
  const label = cleanBrand && cleanName && !cleanName.toLowerCase().startsWith(cleanBrand.toLowerCase())
    ? `${cleanBrand} ${cleanName}`
    : (cleanName || cleanBrand || 'Cigar');
  return `${label} | Cigars For You`;
}

const LEGACY_PRODUCT_BLURB = /^premium hand-rolled\b/i;

export function productDescription(input: {
  brand?: string;
  name?: string;
  shortDescription?: string;
  specifications?: ProductSpecification;
}): string {
  const short = (input.shortDescription || '').trim();
  if (short && !LEGACY_PRODUCT_BLURB.test(short)) return short;

  const cleanName = (input.name || '').trim();
  const cleanBrand = (input.brand || '').trim();
  const label = cleanBrand && cleanName && !cleanName.toLowerCase().startsWith(cleanBrand.toLowerCase())
    ? `${cleanBrand} ${cleanName}`
    : (cleanName || cleanBrand || 'This cigar');
  const spec = input.specifications;
  const detail = [spec?.vitola, spec?.strength ? `${spec.strength} strength` : '', spec?.length ? `${spec.length} long` : '']
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
  if (detail) {
    return `${label}: ${detail}. A Cuban cigar from Cigars For You, stored for delivery across Australia.`;
  }
  return `${label} from Cigars For You. A Cuban cigar stored for delivery across Australia.`;
}

export function categoryDescription(range: ProductRange, brandSlug?: string): string {
  const brand = brandCatalogueCopy(brandSlug);
  if (range === 'cigars' && brand) return brand.meta;
  if (range === 'cigarettes') {
    return 'Retail cigarettes at Cigars For You. This range opens for purchase once products are published.';
  }
  if (range === 'accessories') {
    return 'Lighters, cutters, and other smoking accessories at Cigars For You, published as they become available.';
  }
  return 'Browse Cuban cigars at Cigars For You. Cohiba, Montecristo, Partagás, and more, stored for delivery across Australia.';
}
