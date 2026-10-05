export const SITE_ORIGIN = 'https://cigarsforyou.com.au';

export const DEFAULT_TITLE = 'CigarsForYou — Premium Cuban Cigars & Subscription Delivery';

export type RobotsDirective = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';

export interface SeoState {
  title?: string;
  robots?: RobotsDirective;
  /** Absolute URL, or null to remove the tag. */
  canonical?: string | null;
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

export function applySeo(state: SeoState) {
  if (state.title) document.title = state.title;
  if (state.robots) upsertMeta('robots', state.robots);
  if (state.canonical !== undefined) upsertCanonical(state.canonical);
}

export function productTitle(brand: string | undefined, name: string | undefined): string {
  const cleanName = (name || '').trim();
  const cleanBrand = (brand || '').trim();
  const label = cleanBrand && cleanName && !cleanName.toLowerCase().startsWith(cleanBrand.toLowerCase())
    ? `${cleanBrand} ${cleanName}`
    : (cleanName || cleanBrand || 'Cigar');
  return `${label} | Cigars For You`;
}
