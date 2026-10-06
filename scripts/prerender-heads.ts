/**
 * Copies dist/index.html to one file per indexable URL and fills the head.
 * The body stays the app shell, so the splash and hydration do not change.
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { rangeBasePath } from '../src/constants/productRanges';
import { articleNodes, faqPageNode, productNodes, serializeJsonLd, siteGraph } from '../src/lib/jsonld';
import {
  absoluteCanonical,
  absoluteShareImage,
  catalogueHead,
  newsArticleHead,
  productDescription,
  productTitle,
  PUBLIC_PAGE_HEAD,
  clampMetaDescription,
  type OgType,
} from '../src/lib/seo';
import type { NewsPost, Product, ProductRange } from '../src/types';
import { accessToken, listCollection, readBool, readNumber, readString } from './lib/firestore-rest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function readMapArray(field: { arrayValue?: { values?: Array<{ mapValue?: { fields?: Record<string, unknown> } }> } } | undefined) {
  const values = field?.arrayValue?.values || [];
  return values.map((entry) => entry.mapValue?.fields || {});
}

function productFromDoc(doc: { name: string; fields?: Record<string, any> }): Product | null {
  const fields = doc.fields || {};
  if (!readBool(fields.active)) return null;
  const slug = readString(fields.slug);
  if (!slug) return null;
  const tiers = readMapArray(fields.bulkDiscountTiers).map((tier) => ({
    id: readString(tier.id),
    minQuantity: readNumber(tier.minQuantity),
    unitPriceMultiplier: readNumber(tier.unitPriceMultiplier) || 1,
  })).filter((tier) => tier.minQuantity > 0);
  const specFields = fields.specifications?.mapValue?.fields || {};
  const category = (readString(fields.category) || 'cigars') as ProductRange;
  return {
    id: doc.name.split('/').pop(),
    name: readString(fields.name),
    brand: readString(fields.brand),
    slug,
    price: readNumber(fields.price),
    currency: 'AUD',
    stock: readNumber(fields.stock),
    imageUrl: readString(fields.imageUrl),
    category,
    origin: readString(fields.origin),
    active: true,
    shortDescription: readString(fields.shortDescription),
    specifications: {
      vitola: readString(specFields.vitola),
      length: readString(specFields.length),
      strength: readString(specFields.strength),
    },
    bulkDiscountTiers: tiers,
  };
}

function newsFromDoc(doc: { name: string; fields?: Record<string, any> }): NewsPost | null {
  const fields = doc.fields || {};
  if (!readBool(fields.active)) return null;
  const slug = readString(fields.slug) || doc.name.split('/').pop() || '';
  if (!slug) return null;
  return {
    slug,
    title: readString(fields.title),
    excerpt: readString(fields.excerpt),
    imageUrl: readString(fields.imageUrl),
    body: readString(fields.body),
    publishedAt: readString(fields.publishedAt) || (fields.publishedAt?.timestampValue || '').slice(0, 10),
    readMinutes: readNumber(fields.readMinutes) || 1,
    active: true,
    createdAt: readString(fields.createdAt),
    updatedAt: readString(fields.updatedAt) || (fields.updatedAt?.timestampValue || '').slice(0, 10),
  };
}

interface HeadState {
  title: string;
  description: string;
  robots: string;
  canonical: string;
  jsonld: string;
  image: string;
  ogType: OgType;
}

function replaceMeta(html: string, attr: 'name' | 'property', key: string, content: string): string {
  const pattern = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*\\/?>`);
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function applyHead(html: string, head: HeadState): string {
  let next = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(head.title)}</title>`);
  if (next.includes('name="description"')) {
    next = next.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(head.description)}" />`,
    );
  }
  if (next.includes('rel="canonical"')) {
    next = next.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${escapeHtml(head.canonical)}" />`,
    );
  }
  if (next.includes('name="robots"')) {
    next = next.replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${escapeHtml(head.robots)}" />`,
    );
  }
  next = replaceMeta(next, 'property', 'og:title', head.title);
  next = replaceMeta(next, 'property', 'og:description', head.description);
  next = replaceMeta(next, 'property', 'og:url', head.canonical);
  next = replaceMeta(next, 'property', 'og:type', head.ogType);
  next = replaceMeta(next, 'property', 'og:image', head.image);
  next = replaceMeta(next, 'name', 'twitter:title', head.title);
  next = replaceMeta(next, 'name', 'twitter:description', head.description);
  next = replaceMeta(next, 'name', 'twitter:image', head.image);
  if (next.includes('id="cfy-jsonld"')) {
    next = next.replace(
      /<script type="application\/ld\+json" id="cfy-jsonld">[\s\S]*?<\/script>/,
      `<script type="application/ld+json" id="cfy-jsonld">${head.jsonld}</script>`,
    );
  }
  return next;
}

function outputPath(pathname: string): string {
  if (pathname === '/') return join(DIST, 'index.html');
  return join(DIST, pathname.replace(/^\//, ''), 'index.html');
}

async function run() {
  const shell = await readFile(join(DIST, 'index.html'), 'utf8');
  const pages = new Map<string, HeadState>();

  for (const [pathname, page] of Object.entries(PUBLIC_PAGE_HEAD)) {
    pages.set(pathname, {
      title: page.title,
      description: clampMetaDescription(page.description),
      robots: 'index,follow',
      canonical: absoluteCanonical(pathname),
      jsonld: serializeJsonLd(siteGraph(pathname === '/contact' ? [faqPageNode()] : [])),
      image: absoluteShareImage(),
      ogType: 'website',
    });
  }

  try {
    const token = accessToken();
    const [productDocs, categoryDocs, newsDocs] = await Promise.all([
      listCollection(token, 'products'),
      listCollection(token, 'catalogCategories'),
      listCollection(token, 'newsPosts'),
    ]);
    const products = productDocs.map(productFromDoc).filter((item): item is Product => Boolean(item));
    const news = newsDocs.map(newsFromDoc).filter((item): item is NewsPost => Boolean(item));

    for (const product of products) {
      const description = clampMetaDescription(productDescription(product));
      pages.set(`/product/${product.slug}`, {
        title: productTitle(product.brand, product.name),
        description,
        robots: 'index,follow',
        canonical: absoluteCanonical(`/product/${product.slug}`),
        jsonld: serializeJsonLd(siteGraph(productNodes(product))),
        image: absoluteShareImage(product.imageUrl),
        ogType: 'website',
      });
    }

    for (const range of ['cigars', 'cigarettes', 'accessories'] as const) {
      const indexPath = rangeBasePath(range);
      const indexHead = catalogueHead(range);
      pages.set(indexPath, {
        title: indexHead.title,
        description: clampMetaDescription(indexHead.description),
        robots: 'index,follow',
        canonical: absoluteCanonical(indexPath),
        jsonld: serializeJsonLd(siteGraph()),
        image: absoluteShareImage(),
        ogType: 'website',
      });
    }

    for (const post of news) {
      const head = newsArticleHead(post);
      pages.set(`/news/${post.slug}`, {
        title: head.title,
        description: clampMetaDescription(head.description),
        robots: 'index,follow',
        canonical: absoluteCanonical(`/news/${post.slug}`),
        jsonld: serializeJsonLd(siteGraph(articleNodes(post))),
        image: absoluteShareImage(post.imageUrl),
        ogType: 'article',
      });
    }

    for (const doc of categoryDocs) {
      const fields = doc.fields || {};
      const slug = readString(fields.slug);
      const name = readString(fields.name);
      const range = (readString(fields.range) || 'cigars') as ProductRange;
      if (!slug || !name) continue;
      const count = products.filter((product) => {
        const productRange = product.category || 'cigars';
        if (productRange !== range) return false;
        return (product.brand || '').trim().toLowerCase() === name.trim().toLowerCase();
      }).length;
      if (count === 0) continue;
      const path = `${rangeBasePath(range)}/${slug}`;
      const head = catalogueHead(range, { name, slug });
      pages.set(path, {
        title: head.title,
        description: clampMetaDescription(head.description),
        robots: 'index,follow',
        canonical: absoluteCanonical(path),
        jsonld: serializeJsonLd(siteGraph()),
        image: absoluteShareImage(),
        ogType: 'website',
      });
    }
  } catch (err) {
    console.warn('Firestore was not available. Wrote heads for static pages only.');
    console.warn(err instanceof Error ? err.message : err);
  }

  for (const [pathname, head] of pages) {
    const file = outputPath(pathname);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, applyHead(shell, head));
  }
  console.log(`Wrote ${pages.size} HTML heads under ${DIST}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
