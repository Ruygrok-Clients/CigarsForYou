import { brandCatalogueCopy, RANGE_CATALOGUE } from '../constants/productRanges';
import type { ProductRange, ProductSpecification } from '../types';
import { BRAND_NAME, brandTitle } from './brand';

export const SITE_ORIGIN = 'https://cigarsforyou.com.au';

export const DEFAULT_TITLE = `${BRAND_NAME} — Premium Cuban Cigars & Subscription Delivery`;

/** 1600×900 hero poster. Used when a page has no own image. */
export const DEFAULT_SHARE_IMAGE = `${SITE_ORIGIN}/BG-Vid-poster.jpg`;

export type OgType = 'website' | 'article';

export type RobotsDirective = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';

export interface SeoState {
  title?: string;
  robots?: RobotsDirective;
  /** Absolute URL, or null to remove the tag. */
  canonical?: string | null;
  /** Meta description, or null to remove the tag. */
  description?: string | null;
  /** Absolute or site-relative share image. Omitted uses the default poster. */
  image?: string | null;
  ogType?: OgType;
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

function upsertProperty(property: string, content: string | null) {
  const selector = `meta[property="${property}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

const SOCIAL_PROPERTIES = ['og:site_name', 'og:type', 'og:locale', 'og:title', 'og:description', 'og:url', 'og:image'] as const;
const SOCIAL_NAMES = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'] as const;

function clearSocialMeta() {
  for (const property of SOCIAL_PROPERTIES) upsertProperty(property, null);
  for (const name of SOCIAL_NAMES) upsertMeta(name, null);
}

export function absoluteShareImage(url?: string | null): string {
  const value = (url || '').trim();
  if (!value) return DEFAULT_SHARE_IMAGE;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

function applySocialMeta(state: SeoState) {
  const indexable = state.robots === 'index,follow'
    && Boolean(state.canonical)
    && Boolean(state.title)
    && Boolean(state.description);
  const hidden = state.robots?.startsWith('noindex') || state.canonical === null || state.description === null;
  if (!indexable) {
    if (hidden) clearSocialMeta();
    return;
  }
  const description = clampMetaDescription(state.description || '');
  const image = absoluteShareImage(state.image);
  upsertProperty('og:site_name', BRAND_NAME);
  upsertProperty('og:type', state.ogType || 'website');
  upsertProperty('og:locale', 'en_AU');
  upsertProperty('og:title', state.title || '');
  upsertProperty('og:description', description);
  upsertProperty('og:url', state.canonical || '');
  upsertProperty('og:image', image);
  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', state.title || '');
  upsertMeta('twitter:description', description);
  upsertMeta('twitter:image', image);
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
  applySocialMeta(state);
}

export function productTitle(brand: string | undefined, name: string | undefined): string {
  const cleanName = (name || '').trim();
  const cleanBrand = (brand || '').trim();
  const label = cleanBrand && cleanName && !cleanName.toLowerCase().startsWith(cleanBrand.toLowerCase())
    ? `${cleanBrand} ${cleanName}`
    : (cleanName || cleanBrand || 'Cigar');
  return brandTitle(label);
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
    return `${label}: ${detail}. A Cuban cigar from ${BRAND_NAME}, stored for delivery across Australia.`;
  }
  return `${label} from ${BRAND_NAME}. A Cuban cigar stored for delivery across Australia.`;
}

export const PUBLIC_PAGE_HEAD: Record<string, { title: string; description: string }> = {
  '/': {
    title: DEFAULT_TITLE,
    description: "Australia's premier online humidor. Genuine Cuban cigars delivered to your door, with one-off orders and recurring delivery.",
  },
  '/about': {
    title: brandTitle('About Us'),
    description: `How ${BRAND_NAME} stores Cuban cigars in Sydney and delivers them across Australia, from humidor conditions to sealed dispatch.`,
  },
  '/contact': {
    title: brandTitle('Contact'),
    description: `Contact ${BRAND_NAME} about orders, delivery, and the Cuban cigar catalogue. Email, phone, and the contact form.`,
  },
  '/partnerships': {
    title: brandTitle('Partnerships'),
    description: `Wholesale and venue stocking for licensed Australian businesses. Enquire to carry the ${BRAND_NAME} Cuban cigar range.`,
  },
  '/news': {
    title: brandTitle('News'),
    description: `Notes on storing, choosing, and smoking Cuban cigars from ${BRAND_NAME}, written for Australian conditions.`,
  },
  '/terms': {
    title: brandTitle('Terms & Conditions'),
    description: `Terms and conditions for shopping with ${BRAND_NAME}, including orders, delivery, and use of the site.`,
  },
  '/privacy': {
    title: brandTitle('Privacy Policy'),
    description: `How ${BRAND_NAME} collects, uses, and stores personal information when you browse, enquire, or create an account.`,
  },
  '/cookies': {
    title: brandTitle('Cookies Policy'),
    description: `How ${BRAND_NAME} uses cookies, including analytics, and the choices available to you.`,
  },
  '/refund-policy': {
    title: brandTitle('Refund & Return Policy'),
    description: `Refund and return rules for ${BRAND_NAME} orders, including tobacco products and delivery issues.`,
  },
  '/compliance': {
    title: brandTitle('Compliance'),
    description: `Age, licensing, and tobacco compliance information for shopping with ${BRAND_NAME} in Australia.`,
  },
};

export function catalogueHead(range: ProductRange, brand?: { name: string; slug: string }): { title: string; description: string } {
  const copy = RANGE_CATALOGUE[range];
  const title = brand
    ? brandTitle(`${brand.name} ${copy.titledSuffix}`)
    : brandTitle(copy.title);
  return { title, description: categoryDescription(range, brand?.slug) };
}

export function newsArticleHead(post: { title: string; excerpt?: string }): { title: string; description: string } {
  return {
    title: brandTitle(post.title),
    description: post.excerpt || '',
  };
}

export function categoryDescription(range: ProductRange, brandSlug?: string): string {
  const brand = brandCatalogueCopy(brandSlug);
  if (range === 'cigars' && brand) return brand.meta;
  if (range === 'cigarettes') {
    return `Retail cigarettes at ${BRAND_NAME}. This range opens for purchase once products are published.`;
  }
  if (range === 'accessories') {
    return `Lighters, cutters, and other smoking accessories at ${BRAND_NAME}, published as they become available.`;
  }
  return `Browse Cuban cigars at ${BRAND_NAME}. Cohiba, Montecristo, Partagás, and more, stored for delivery across Australia.`;
}
