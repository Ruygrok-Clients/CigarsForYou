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

const CORE_PATHS = [
  '/',
  '/shop',
  '/cigarettes',
  '/accessories',
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

async function run() {
  const accessToken = token();
  const [products, categories, news] = await Promise.all([
    listCollection(accessToken, 'products'),
    listCollection(accessToken, 'catalogCategories'),
    listCollection(accessToken, 'newsPosts')
  ]);

  const paths = new Set(CORE_PATHS);

  for (const doc of categories) {
    const fields = doc.fields || {};
    const slug = readString(fields.slug);
    const range = readString(fields.range) || 'cigars';
    const path = categoryPath(range, slug);
    if (path) paths.add(path);
  }

  for (const doc of products) {
    const fields = doc.fields || {};
    if (fields.active?.booleanValue === false) continue;
    const slug = readString(fields.slug);
    if (slug) paths.add(`/product/${slug}`);
  }

  for (const doc of news) {
    const fields = doc.fields || {};
    if (fields.active?.booleanValue === false) continue;
    const slug = readString(fields.slug) || doc.name.split('/').pop();
    if (slug) paths.add(`/news/${slug}`);
  }

  const urls = [...paths].sort((a, b) => a.localeCompare(b));
  const body = urls
    .map((path) => `  <url><loc>${xmlEscape(`${ORIGIN}${path}`)}</loc></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  writeFileSync(OUT, xml);
  console.log(`Wrote ${urls.length} URLs to ${OUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
