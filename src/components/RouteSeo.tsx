import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyJsonLd, siteGraph } from '../lib/jsonld';
import { absoluteCanonical, applySeo, canonicalPath, DEFAULT_TITLE, PUBLIC_PAGE_HEAD } from '../lib/seo';

const UTILITY_TITLES: Record<string, string> = {
  '/cart': 'Cart | Cigars For You',
  '/checkout': 'Checkout | Cigars For You',
  '/checkout-details': 'Checkout | Cigars For You',
  '/account': 'Account | Cigars For You',
  '/login': 'Log In | Cigars For You',
  '/signup': 'Sign Up | Cigars For You',
  '/forgot-password': 'Forgot Password | Cigars For You',
  '/order-confirmation': 'Order Confirmation | Cigars For You',
  '/age-restricted': 'Age Restricted | Cigars For You',
};

function isCataloguePath(path: string): boolean {
  return path === '/shop' || path.startsWith('/shop/')
    || path === '/cigarettes' || path.startsWith('/cigarettes/')
    || path === '/accessories' || path.startsWith('/accessories/');
}

function ownsPageGraph(path: string): boolean {
  return path.startsWith('/product/') || path.startsWith('/news/');
}

/**
 * Baseline document head for the current route.
 * Catalogue, product, and article pages override this after their data loads.
 */
export function RouteSeo() {
  const location = useLocation();

  useLayoutEffect(() => {
    const path = canonicalPath(location.pathname);

    if (path === '/admin' || path.startsWith('/admin/')) {
      applySeo({ title: 'Admin | Cigars For You', robots: 'noindex,nofollow', canonical: null, description: null });
      applyJsonLd(null);
      return;
    }

    if (UTILITY_TITLES[path]) {
      applySeo({ title: UTILITY_TITLES[path], robots: 'noindex,nofollow', canonical: null, description: null });
      applyJsonLd(siteGraph());
      return;
    }

    if (ownsPageGraph(path)) {
      applySeo({ robots: 'noindex,follow', canonical: null, description: null });
      return;
    }

    if (isCataloguePath(path)) {
      const params = new URLSearchParams(location.search);
      const trapped = ['search', 'brand', 'category'].some((key) => (params.get(key) || '').trim());
      applySeo({
        robots: trapped ? 'noindex,follow' : 'index,follow',
        canonical: absoluteCanonical(path),
      });
      applyJsonLd(siteGraph());
      return;
    }

    const page = PUBLIC_PAGE_HEAD[path];
    if (page) {
      applySeo({
        title: page.title,
        robots: 'index,follow',
        canonical: absoluteCanonical(path),
        description: page.description,
      });
      applyJsonLd(siteGraph());
      return;
    }

    applySeo({ title: DEFAULT_TITLE, robots: 'noindex,follow', canonical: null, description: null });
    applyJsonLd(siteGraph());
  }, [location.pathname, location.search]);

  return null;
}
