/**
 * One-off: write bulkDiscountTiers onto cigar and cigarette products
 * and remove packagingOptions. Does not change price or stock.
 *
 * Usage: node scripts/migrate-bulk-discount-tiers.js
 */
import { execSync } from 'child_process';

const PROJECT_ID = 'cigarsforyou-ea835';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products`;

const TIERS = [
  { id: 'qty1', minQuantity: 1, unitPriceMultiplier: 1 },
  { id: 'qty10', minQuantity: 10, unitPriceMultiplier: 0.95 },
  { id: 'qty25', minQuantity: 25, unitPriceMultiplier: 0.93 }
];

function tiersField() {
  return {
    arrayValue: {
      values: TIERS.map((tier) => ({
        mapValue: {
          fields: {
            id: { stringValue: tier.id },
            minQuantity: { integerValue: String(tier.minQuantity) },
            unitPriceMultiplier: { doubleValue: tier.unitPriceMultiplier }
          }
        }
      }))
    }
  };
}

function isTobacco(category) {
  return !category || category === 'cigars' || category === 'cigarettes';
}

async function listAll(token) {
  const docs = [];
  let pageToken = '';
  do {
    const url = pageToken
      ? `${BASE}?pageSize=100&pageToken=${encodeURIComponent(pageToken)}`
      : `${BASE}?pageSize=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`List failed ${res.status}: ${await res.text()}`);
    const data = await res.json();
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function patchProduct(token, doc) {
  const id = doc.name.split('/').pop();
  const category = doc.fields?.category?.stringValue;
  if (!isTobacco(category)) return 'skipped';

  const url = `${BASE}/${id}?updateMask.fieldPaths=bulkDiscountTiers&updateMask.fieldPaths=packagingOptions`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: { bulkDiscountTiers: tiersField() } })
  });
  if (!res.ok) throw new Error(`Patch ${id} failed ${res.status}: ${await res.text()}`);
  return 'updated';
}

async function run() {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const docs = await listAll(token);
  let updated = 0;
  let skipped = 0;
  for (const doc of docs) {
    const result = await patchProduct(token, doc);
    if (result === 'updated') updated += 1;
    else skipped += 1;
  }
  console.log(`Updated ${updated} tobacco products. Skipped ${skipped} accessories.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
