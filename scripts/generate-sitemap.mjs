/**
 * Writes public/sitemap.xml from core routes plus published products,
 * catalog categories, and news posts in Firestore.
 *
 * Usage: node scripts/generate-sitemap.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const PROJECT_ID = 'cigarsforyou-ea835';
const ORIGIN = 'https://cigarsforyou.com.au';
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sitemap.xml');

/** Marketing and legal URLs. No lastmod — these are not catalog records. */
const CORE_PATHS = [
  '/',
  '/about',
  '/news',
  '/contact',
  '/partnerships',
  '/terms',
  '/privacy',
  '/cookies',
  '/refund-policy',
  '/compliance'
];

function token() {
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch {
    return execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim();
  }
}

function readString(field) {
  return field?.stringValue || '';
}

async function listCollection(accessToken, collectionId) {
  const docs = [];
  let pageToken = '';
  do {
    const url = pageToken
      ? `${ROOT}/${collectionId}?pageSize=300&pageToken=${encodeURIComponent(pageToken)}`
      : `${ROOT}/${collectionId}?pageSize=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`List ${collectionId} failed ${res.status}: ${await res.text()}`);
    const data = await res.json();
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function categoryPath(range, slug) {
  if (!slug) return '';
  if (range === 'cigarettes') return `/cigarettes/${slug}`;
  if (range === 'accessories') return `/accessories/${slug}`;
  return `/shop/${slug}`;
}

function rangeIndexPath(range) {
  if (range === 'cigarettes') return '/cigarettes';
  if (range === 'accessories') return '/accessories';
  return '/shop';
}

function dateOnly(value) {
  if (!value || typeof value !== 'string') return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function docUpdated(doc) {
  const fields = doc.fields || {};
  return dateOnly(fields.updatedAt?.timestampValue)
    || dateOnly(fields.updatedAt?.stringValue)
    || dateOnly(doc.updateTime);
}

function later(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

function productRange(fields) {
  return readString(fields.category) || 'cigars';
}

function productMatchesCategory(fields, category) {
  const range = productRange(fields);
  if (range !== category.range) return false;
  const catalogCategoryId = readString(fields.catalogCategoryId);
  if (category.id && catalogCategoryId === category.id) return true;
  return readString(fields.brand).trim().toLowerCase() === category.name.trim().toLowerCase();
}

function urlEntry(path, lastmod) {
  const loc = `    <loc>${xmlEscape(`${ORIGIN}${path}`)}</loc>`;
  const mod = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n${loc}${mod}\n  </url>`;
}

async function run() {
  const accessToken = token();
  const [products, categories, news] = await Promise.all([
    listCollection(accessToken, 'products'),
    listCollection(accessToken, 'catalogCategories'),
    listCollection(accessToken, 'newsPosts')
  ]);

  const activeProducts = products.filter((doc) => doc.fields?.active?.booleanValue === true);
  const entries = new Map();

  for (const path of CORE_PATHS) entries.set(path, null);

  for (const doc of activeProducts) {
    const fields = doc.fields || {};
    const slug = readString(fields.slug);
    if (!slug) continue;
    const updated = docUpdated(doc);
    entries.set(`/product/${slug}`, later(entries.get(`/product/${slug}`), updated));
    const indexPath = rangeIndexPath(productRange(fields));
    entries.set(indexPath, later(entries.get(indexPath) || null, updated));
  }

  for (const doc of categories) {
    const fields = doc.fields || {};
    const slug = readString(fields.slug);
    const range = readString(fields.range) || 'cigars';
    const path = categoryPath(range, slug);
    if (!path) continue;
    const category = {
      id: doc.name.split('/').pop(),
      name: readString(fields.name),
      range
    };
    const inCategory = activeProducts.filter((product) => productMatchesCategory(product.fields || {}, category));
    if (inCategory.length === 0) continue;
    let lastmod = docUpdated(doc);
    for (const product of inCategory) lastmod = later(lastmod, docUpdated(product));
    entries.set(path, lastmod);
  }

  for (const doc of news) {
    const fields = doc.fields || {};
    if (fields.active?.booleanValue !== true) continue;
    const slug = readString(fields.slug) || doc.name.split('/').pop();
    if (!slug) continue;
    entries.set(`/news/${slug}`, docUpdated(doc));
  }

  const urls = [...entries.keys()].sort((a, b) => a.localeCompare(b));
  const body = urls.map((path) => urlEntry(path, entries.get(path))).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  writeFileSync(OUT, xml);
  console.log(`Wrote ${urls.length} URLs to ${OUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
