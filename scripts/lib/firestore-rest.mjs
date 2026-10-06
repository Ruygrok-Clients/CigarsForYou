import { execSync } from 'child_process';

const PROJECT_ID = 'cigarsforyou-ea835';
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export function accessToken() {
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch {
    return execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim();
  }
}

export function readString(field) {
  return field?.stringValue || '';
}

export function readNumber(field) {
  if (!field) return 0;
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.integerValue !== undefined) return Number(field.integerValue);
  return 0;
}

export function readBool(field) {
  return field?.booleanValue === true;
}

export async function listCollection(token, collectionId) {
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
