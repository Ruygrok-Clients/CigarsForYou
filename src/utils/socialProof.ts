export const SOCIAL_PROOF_VISIBLE_MINUTES = 59;
export const SOCIAL_PROOF_VISIBLE_MS = SOCIAL_PROOF_VISIBLE_MINUTES * 60 * 1000;

export type SocialProofEventType = 'order' | 'newsletter' | 'stock_notify' | 'site_viewers';
export type SocialProofSource =
  | 'generated'
  | 'order'
  | 'newsletter'
  | 'stock_notify'
  | 'site_viewers';

export interface SocialProofItem {
  id: string;
  eventType: SocialProofEventType;
  firstName: string;
  location: string;
  productName: string;
  productSlug: string;
  viewerCount?: number;
  displayAtMs: number;
  source: SocialProofSource;
}

export function formatTimeAgo(displayAtMs: number, nowMs: number): string {
  const minutes = Math.max(0, Math.floor((nowMs - displayAtMs) / 60_000));
  if (minutes <= 0) return 'just now';
  if (minutes === 1) return '1 minute ago';
  return `${minutes} minutes ago`;
}

export function isSocialProofActive(displayAtMs: number, nowMs: number): boolean {
  if (displayAtMs > nowMs) return false;
  return nowMs - displayAtMs <= SOCIAL_PROOF_VISIBLE_MS;
}
