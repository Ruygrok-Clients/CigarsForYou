/**
 * Grandfather existing Firestore users as age verified for the Didit model.
 *
 * Sets on every users/{uid} doc that is not already ageVerified === true:
 *   ageVerified: true
 *   ageVerificationStatus: "Approved"
 *   ageVerifiedAt: <ISO timestamp>
 *   ageVerificationSource: "legacy_grandfather"
 *
 * Auth: uses `gcloud auth print-access-token` (same pattern as seed-firestore-gcloud.js).
 *
 * Usage (from repo root):
 *   node scripts/grandfather-age-verified-users.js
 *   node scripts/grandfather-age-verified-users.js --dry-run
 */

import { execSync } from 'child_process';

const PROJECT_ID = 'cigarsforyou-ea835';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const dryRun = process.argv.includes('--dry-run');

function getAccessToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function listUsers(token) {
  const docs = [];
  let pageToken = '';

  do {
    const url = new URL(`${BASE}/users`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error(`Failed to list users: ${res.status} ${await res.text()}`);
    }

    const body = await res.json();
    for (const doc of body.documents || []) {
      docs.push(doc);
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);

  return docs;
}

function docIdFromName(name) {
  const parts = String(name || '').split('/');
  return parts[parts.length - 1] || '';
}

function isAlreadyVerified(fields) {
  return fields?.ageVerified?.booleanValue === true;
}

async function patchUser(token, docName, patch) {
  const url = new URL(`${BASE}/users/${encodeURIComponent(docIdFromName(docName))}`);
  url.searchParams.append('updateMask.fieldPaths', 'ageVerified');
  url.searchParams.append('updateMask.fieldPaths', 'ageVerificationStatus');
  url.searchParams.append('updateMask.fieldPaths', 'ageVerifiedAt');
  url.searchParams.append('updateMask.fieldPaths', 'ageVerificationSource');

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        ageVerified: { booleanValue: patch.ageVerified },
        ageVerificationStatus: { stringValue: patch.ageVerificationStatus },
        ageVerifiedAt: { stringValue: patch.ageVerifiedAt },
        ageVerificationSource: { stringValue: patch.ageVerificationSource }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to update ${docIdFromName(docName)}: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  console.log('Obtaining access token from gcloud CLI...');
  const token = getAccessToken();
  const now = new Date().toISOString();
  const patch = {
    ageVerified: true,
    ageVerificationStatus: 'Approved',
    ageVerifiedAt: now,
    ageVerificationSource: 'legacy_grandfather'
  };

  console.log(dryRun ? 'DRY RUN — no writes will be committed.' : 'Updating existing users…');
  const docs = await listUsers(token);

  let alreadyVerified = 0;
  let updated = 0;
  let failed = 0;

  for (const doc of docs) {
    const id = docIdFromName(doc.name);
    const email = doc.fields?.email?.stringValue || 'no-email';

    if (isAlreadyVerified(doc.fields)) {
      alreadyVerified += 1;
      continue;
    }

    if (dryRun) {
      console.log(`  would update ${id} (${email})`);
      updated += 1;
      continue;
    }

    try {
      await patchUser(token, doc.name, patch);
      updated += 1;
      console.log(`  updated ${id} (${email})`);
    } catch (err) {
      failed += 1;
      console.error(err instanceof Error ? err.message : err);
    }
  }

  console.log('');
  console.log('Done.');
  console.log(`  scanned:           ${docs.length}`);
  console.log(`  already verified:  ${alreadyVerified}`);
  console.log(`  ${dryRun ? 'would update' : 'updated'}:        ${updated}`);
  if (failed) console.log(`  failed:            ${failed}`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
