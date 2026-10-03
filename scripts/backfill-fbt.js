/**
 * One-off: set fbtStat (20-38), fbtDefaultIds, and fbtCompanionIds.
 * Does not overwrite a stat or a default pool that is already stored.
 *
 * Usage: node scripts/backfill-fbt.js
 * Requires functions to be compiled first (`npx tsc` in functions/).
 */
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chooseCompanionIds, pairCountsFromOrders, starterDefaultIds } = require('../functions/lib/fbtCompanions.js');

const PROJECT_ID = 'cigarsforyou-ea835';
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function readString(field) {
  return field?.stringValue || '';
}

function readStrings(field) {
  return (field?.arrayValue?.values || []).map((item) => item.stringValue || '').filter(Boolean);
}

function readNumber(field) {
  if (!field) return undefined;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  return undefined;
}

function textList(values) {
  return {
    arrayValue: {
      values: values.map((item) => ({ stringValue: item }))
    }
  };
}

function docId(document) {
  return document.name.split('/').pop();
}

async function listCollection(token, collectionId) {
  const docs = [];
  let pageToken = '';
  do {
    const url = pageToken
      ? `${ROOT}/${collectionId}?pageSize=300&pageToken=${encodeURIComponent(pageToken)}`
      : `${ROOT}/${collectionId}?pageSize=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List ${collectionId} failed ${res.status}: ${await res.text()}`);
    const data = await res.json();
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

function toProduct(document) {
  const fields = document.fields || {};
  const stat = readNumber(fields.fbtStat);
  return {
    id: docId(document),
    name: readString(fields.name),
    brand: readString(fields.brand),
    category: readString(fields.category) || 'cigars',
    active: fields.active?.booleanValue !== false,
    fbtRanges: readStrings(fields.fbtRanges),
    fbtDefaultIds: readStrings(fields.fbtDefaultIds),
    fbtStat: typeof stat === 'number' && !Number.isNaN(stat) ? stat : undefined,
    documentName: document.name
  };
}

function toOrder(document) {
  const fields = document.fields || {};
  const items = (fields.items?.arrayValue?.values || []).map((entry) => ({
    productId: readString(entry.mapValue?.fields?.productId)
  }));
  return {
    status: readString(fields.status),
    items
  };
}

async function patchProduct(token, documentName, fields, mask) {
  const params = mask.map((path) => `updateMask.fieldPaths=${encodeURIComponent(path)}`).join('&');
  const res = await fetch(`https://firestore.googleapis.com/v1/${documentName}?${params}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) throw new Error(`Patch failed ${res.status}: ${await res.text()}`);
}

async function run() {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const [productDocs, orderDocs] = await Promise.all([
    listCollection(token, 'products'),
    listCollection(token, 'orders')
  ]);
  const catalog = productDocs.map(toProduct);
  const defaults = starterDefaultIds(catalog);
  const pairs = pairCountsFromOrders(orderDocs.map(toOrder));
  const prepared = catalog.map((product) => ({
    ...product,
    fbtDefaultIds: product.fbtDefaultIds.length > 0
      ? product.fbtDefaultIds
      : defaults.filter((id) => id !== product.id)
  }));

  let updated = 0;
  for (const product of prepared) {
    const original = catalog.find((item) => item.id === product.id);
    const fields = {
      fbtCompanionIds: textList(chooseCompanionIds(product, prepared, pairs.get(product.id) || new Map()))
    };
    const mask = ['fbtCompanionIds'];
    if (!original.fbtDefaultIds.length) {
      fields.fbtDefaultIds = textList(product.fbtDefaultIds);
      mask.push('fbtDefaultIds');
    }
    if (typeof original.fbtStat !== 'number') {
      fields.fbtStat = { integerValue: String(20 + Math.floor(Math.random() * 19)) };
      mask.push('fbtStat');
    }
    await patchProduct(token, product.documentName, fields, mask);
    updated += 1;
  }
  console.log(`Updated ${updated} product(s). Default pool size: ${defaults.length}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
