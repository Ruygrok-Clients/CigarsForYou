import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { absoluteCanonical, applySeo, canonicalPath, DEFAULT_TITLE } from '../lib/seo';

const STATIC_TITLES: Record<string, string> = {
  '/': DEFAULT_TITLE,
  '/about': 'About Us | Cigars For You',
  '/contact': 'Contact | Cigars For You',
  '/partnerships': 'Partnerships | Cigars For You',
  '/news': 'News | Cigars For You',
  '/terms': 'Terms & Conditions | Cigars For You',
  '/privacy': 'Privacy Policy | Cigars For You',
  '/cookies': 'Cookies Policy | Cigars For You',
  '/refund-policy': 'Refund & Return Policy | Cigars For You',
  '/compliance': 'Compliance | Cigars For You',
};

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

/**
 * Baseline document head for the current route.
 * Catalogue, product, and article pages override this after their data loads.
 */
export function RouteSeo() {
  const location = useLocation();

  useLayoutEffect(() => {
    const path = canonicalPath(location.pathname);

    if (path === '/admin' || path.startsWith('/admin/')) {
      applySeo({ title: 'Admin | Cigars For You', robots: 'noindex,nofollow', canonical: null });
      return;
    }

    if (UTILITY_TITLES[path]) {
      applySeo({ title: UTILITY_TITLES[path], robots: 'noindex,nofollow', canonical: null });
      return;
    }

    if (path.startsWith('/product/') || path.startsWith('/news/')) {
      applySeo({ robots: 'noindex,follow', canonical: null });
      return;
    }

    if (isCataloguePath(path)) {
      const params = new URLSearchParams(location.search);
      const trapped = ['search', 'brand', 'category'].some((key) => (params.get(key) || '').trim());
      applySeo({
        robots: trapped ? 'noindex,follow' : 'index,follow',
        canonical: absoluteCanonical(path),
      });
      return;
    }

    const title = STATIC_TITLES[path];
    if (title) {
      applySeo({ title, robots: 'index,follow', canonical: absoluteCanonical(path) });
      return;
    }

    applySeo({ title: DEFAULT_TITLE, robots: 'noindex,follow', canonical: null });
  }, [location.pathname, location.search]);

  return null;
}
