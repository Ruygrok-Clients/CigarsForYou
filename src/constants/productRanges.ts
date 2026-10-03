import type { ProductRange } from '../types';

export const PRODUCT_RANGES: ProductRange[] = ['cigars', 'cigarettes', 'accessories'];

/** Navbar and footer pills used until cigar categories exist in Firestore. */
export const CIGAR_BRANDS = [
  { name: 'Cohiba', slug: 'cohiba' },
  { name: 'Partagas', slug: 'partagas' },
  { name: 'Romeo y Julieta', slug: 'romeo-y-julieta' },
  { name: 'Montecristo', slug: 'montecristo' },
  { name: 'Hoyo De Monterrey', slug: 'hoyo-de-monterrey' },
  { name: 'H. Upmann', slug: 'h-upmann' },
  { name: 'Punch', slug: 'punch' }
];

/** Customer CATEGORIES list seeded into Firestore the first time an admin opens Products & Stock. */
export const DEFAULT_CIGAR_CATEGORIES = [
  { name: 'Cohiba', slug: 'cohiba' },
  { name: 'Montecristo', slug: 'montecristo' },
  { name: 'Partagas', slug: 'partagas' },
  { name: 'Romeo y Julieta', slug: 'romeo-y-julieta' },
  { name: 'Hoyo De Monterrey', slug: 'hoyo-de-monterrey' },
  { name: 'Trinidad', slug: 'trinidad' },
  { name: 'Bolivar', slug: 'bolivar' },
  { name: 'H. Upmann', slug: 'h-upmann' }
];

export function slugifyLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function productMatchesRange(category: string | undefined, range: ProductRange): boolean {
  if (range === 'cigars') return !category || category === 'cigars';
  return category === range;
}

export function rangeBasePath(range: ProductRange): string {
  if (range === 'cigarettes') return '/cigarettes';
  if (range === 'accessories') return '/accessories';
  return '/shop';
}

export function rangeLabel(range: ProductRange): string {
  if (range === 'cigarettes') return 'Cigarettes';
  if (range === 'accessories') return 'Accessories';
  return 'Cigars';
}

export interface RangeCatalogueCopy {
  eyebrow: string;
  title: string;
  titledSuffix: string;
  allLabel: string;
  blurb: (count: number) => string;
  searchPlaceholder: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
}

export const RANGE_CATALOGUE: Record<ProductRange, RangeCatalogueCopy> = {
  cigars: {
    eyebrow: 'Genuine Habanos Selection',
    title: 'Cuban Cigars',
    titledSuffix: 'Cigars',
    allLabel: 'All Cigars',
    blurb: (count) => `Browse our full catalogue of ${count} fine hand-rolled cigars, stored at optimal humidor conditions.`,
    searchPlaceholder: 'Search cigars...',
    loading: 'Loading Cuban cigar catalog...',
    emptyTitle: 'No cigars match your criteria',
    emptyBody: 'Try resetting your search query or selecting a different category.'
  },
  cigarettes: {
    eyebrow: 'Retail Cigarettes',
    title: 'Cigarettes',
    titledSuffix: 'Cigarettes',
    allLabel: 'All Cigarettes',
    blurb: (count) => `Browse ${count} cigarette ${count === 1 ? 'product' : 'products'} currently published for delivery.`,
    searchPlaceholder: 'Search cigarettes...',
    loading: 'Loading cigarette catalog...',
    emptyTitle: 'No cigarettes match your criteria',
    emptyBody: 'Try resetting your search query or selecting a different category.'
  },
  accessories: {
    eyebrow: 'Smoking Accessories',
    title: 'Accessories',
    titledSuffix: 'Accessories',
    allLabel: 'All Accessories',
    blurb: (count) => `Browse ${count} ${count === 1 ? 'accessory' : 'accessories'} currently published for delivery.`,
    searchPlaceholder: 'Search accessories...',
    loading: 'Loading accessories catalog...',
    emptyTitle: 'No accessories match your criteria',
    emptyBody: 'Try resetting your search query or selecting a different category.'
  }
};

export interface ComingSoonCopy {
  badge: string;
  title: string;
  body: string;
  toast: string;
  confirm: string;
  source: 'cigars-coming-soon' | 'cigarettes-coming-soon' | 'accessories-coming-soon';
}

export const RANGE_COMING_SOON: Record<ProductRange, ComingSoonCopy> = {
  cigars: {
    badge: 'Cuban Cigars',
    title: 'Cuban Cigars',
    body: 'Our humidor catalogue is not open for purchase yet. Cigars will appear here as soon as they are published.',
    toast: 'Thank you! You will be notified when cigars are available.',
    confirm: 'the cigar catalogue opens for delivery',
    source: 'cigars-coming-soon'
  },
  cigarettes: {
    badge: 'Retail Cigarettes Category',
    title: 'Retail Cigarettes',
    body: 'We are currently completing regulatory licensing and stock logistics for retail cigarette brands in Australia. Purchasing is not currently available for this category.',
    toast: 'Thank you! You will be notified when cigarettes launch.',
    confirm: 'the retail cigarette catalog opens for delivery',
    source: 'cigarettes-coming-soon'
  },
  accessories: {
    badge: 'Accessories',
    title: 'Accessories',
    body: 'Lighters, cutters, cases, and other accessories are not available for purchase yet. This catalogue will open as soon as products are published.',
    toast: 'Thank you! You will be notified when accessories launch.',
    confirm: 'the accessories catalogue opens for delivery',
    source: 'accessories-coming-soon'
  }
};
