import { CONTACT_FAQS } from '../constants/contactFaqs';
import { rangeBasePath, rangeLabel, slugifyLabel } from '../constants/productRanges';
import type { NewsPost, Product, ProductRange } from '../types';
import { getBulkTiers, isTobaccoRange, resolveTier, unitPriceForTier } from '../utils/bulkPricing';
import { BRAND_ABN, BRAND_NAME } from './brand';
import { absoluteCanonical, clampMetaDescription, DEFAULT_DESCRIPTION, productDescription, SITE_ORIGIN } from './seo';

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
export const JSONLD_ELEMENT_ID = 'cfy-jsonld';

type JsonLdNode = Record<string, unknown>;

export interface JsonLdDocument {
  '@context': 'https://schema.org';
  '@graph': JsonLdNode[];
}

function absoluteResource(url: string | undefined): string {
  const value = (url || '').trim();
  if (!value) return '';
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function organizationNode(): JsonLdNode {
  return {
    '@type': ['OnlineStore', 'Organization'],
    '@id': ORGANIZATION_ID,
    name: BRAND_NAME,
    description: DEFAULT_DESCRIPTION,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/logo.svg`,
    email: 'hello@cigarsforyou.com.au',
    telephone: '+61-417-772-595',
    taxID: BRAND_ABN,
  };
}

export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: BRAND_NAME,
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function faqPageNode(items: { q: string; a: string }[] = CONTACT_FAQS): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteCanonical('/contact')}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function siteGraph(extra: JsonLdNode[] = []): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationNode(), websiteNode(), ...extra],
  };
}

/** Unit price shown when quantity is 1. */
export function quantityOnePrice(product: Pick<Product, 'price' | 'category' | 'bulkDiscountTiers'>): number {
  if (!isTobaccoRange(product.category)) return Math.round(product.price * 100) / 100;
  return unitPriceForTier(product.price, resolveTier(getBulkTiers(product), 1));
}

export function productNodes(product: Pick<Product,
  'active' | 'slug' | 'name' | 'brand' | 'imageUrl' | 'shortDescription' | 'specifications' | 'price' | 'category' | 'bulkDiscountTiers' | 'stock'
>): JsonLdNode[] {
  if (product.active !== true || !product.slug) return [];
  const range: ProductRange = product.category || 'cigars';
  const rangePath = rangeBasePath(range);
  const productUrl = absoluteCanonical(`/product/${product.slug}`);
  const brandSlug = slugifyLabel(product.brand || '');
  const image = absoluteResource(product.imageUrl);
  const description = clampMetaDescription(productDescription(product));
  const price = quantityOnePrice(product);

  const breadcrumb: JsonLdNode = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: rangeLabel(range),
        item: absoluteCanonical(rangePath),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.brand,
        item: absoluteCanonical(brandSlug ? `${rangePath}/${brandSlug}` : rangePath),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  const productNode: JsonLdNode = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description,
    sku: product.slug,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'AUD',
      price: price.toFixed(2),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@id': ORGANIZATION_ID },
    },
  };
  if (image) productNode.image = image;
  return [breadcrumb, productNode];
}

export function articleNodes(post: Pick<NewsPost, 'slug' | 'title' | 'excerpt' | 'imageUrl' | 'publishedAt' | 'updatedAt' | 'active'>): JsonLdNode[] {
  if (post.active === false || !post.slug || !post.title) return [];
  const url = absoluteCanonical(`/news/${post.slug}`);
  const image = absoluteResource(post.imageUrl);
  const article: JsonLdNode = {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: clampMetaDescription(post.excerpt || post.title),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: url,
    publisher: { '@id': ORGANIZATION_ID },
  };
  if (image) article.image = image;
  return [article];
}

export function applyJsonLd(documentGraph: JsonLdDocument | null) {
  const existing = document.getElementById(JSONLD_ELEMENT_ID);
  if (!documentGraph) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement('script');
  el.id = JSONLD_ELEMENT_ID;
  el.setAttribute('type', 'application/ld+json');
  el.textContent = serializeJsonLd(documentGraph);
  if (!existing) document.head.appendChild(el);
}
