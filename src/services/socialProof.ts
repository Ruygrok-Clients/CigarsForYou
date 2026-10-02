import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  isSocialProofActive,
  SOCIAL_PROOF_VISIBLE_MS,
  type SocialProofEventType,
  type SocialProofItem,
  type SocialProofSource,
} from '../utils/socialProof';

const EVENT_TYPES = new Set<SocialProofEventType>([
  'order',
  'newsletter',
  'stock_notify',
  'site_viewers',
]);

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapDoc(id: string, data: Record<string, unknown>): SocialProofItem | null {
  const eventType = asString(data.eventType) as SocialProofEventType;
  if (!EVENT_TYPES.has(eventType)) return null;

  const displayAt = data.displayAt;
  const displayAtMs = displayAt instanceof Timestamp
    ? displayAt.toMillis()
    : typeof displayAt === 'number'
      ? displayAt
      : null;
  if (displayAtMs == null) return null;

  const rawSource = asString(data.source);
  const source: SocialProofSource =
    rawSource === 'order'
    || rawSource === 'newsletter'
    || rawSource === 'stock_notify'
    || rawSource === 'site_viewers'
      ? rawSource
      : 'generated';
  const viewerCount = typeof data.viewerCount === 'number' ? data.viewerCount : undefined;

  return {
    id,
    eventType,
    firstName: asString(data.firstName),
    location: asString(data.location),
    productName: asString(data.productName),
    productSlug: asString(data.productSlug),
    viewerCount,
    displayAtMs,
    source,
  };
}

export async function fetchSocialProofItems(nowMs = Date.now()): Promise<SocialProofItem[]> {
  try {
    const feedQuery = query(
      collection(db, 'social_proof'),
      where('displayAt', '>=', Timestamp.fromMillis(nowMs - SOCIAL_PROOF_VISIBLE_MS)),
      where('displayAt', '<=', Timestamp.fromMillis(nowMs)),
      orderBy('displayAt', 'desc'),
      limit(40),
    );

    const snap = await getDocs(feedQuery);
    return snap.docs
      .map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
      .filter((item): item is SocialProofItem => item != null)
      .filter((item) => isSocialProofActive(item.displayAtMs, nowMs));
  } catch {
    return [];
  }
}
