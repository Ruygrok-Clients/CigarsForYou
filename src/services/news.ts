import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { NewsPost } from '../types';

export type NewsBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string };

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapNewsPost(id: string, data: Record<string, unknown>): NewsPost {
  return {
    id,
    slug: asString(data.slug) || id,
    title: asString(data.title),
    excerpt: asString(data.excerpt),
    imageUrl: asString(data.imageUrl),
    body: asString(data.body),
    publishedAt: asString(data.publishedAt),
    readMinutes: asNumber(data.readMinutes, 1),
    active: data.active !== false,
    createdAt: asString(data.createdAt),
    updatedAt: asString(data.updatedAt)
  };
}

export function slugifyNewsTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatNewsDate(value: string): string {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();
}

export function newsMetaLine(post: Pick<NewsPost, 'publishedAt' | 'readMinutes'>): string {
  const date = formatNewsDate(post.publishedAt);
  const minutes = Math.max(1, Math.round(post.readMinutes || 1));
  const label = minutes === 1 ? '1 MIN READ' : `${minutes} MIN READ`;
  return date ? `${date} · ${label}` : label;
}

export function parseNewsBody(body: string): NewsBlock[] {
  const chunks = body.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const blocks: NewsBlock[] = [];
  for (const chunk of chunks) {
    const text = chunk.trim();
    if (!text) continue;
    if (text.startsWith('## ')) {
      const heading = text.slice(3).trim();
      if (heading) blocks.push({ type: 'heading', text: heading });
      continue;
    }
    blocks.push({ type: 'paragraph', text: text.replace(/\n+/g, ' ').trim() });
  }
  return blocks;
}

export async function fetchPublishedNews(): Promise<NewsPost[]> {
  const snap = await getDocs(query(collection(db, 'newsPosts'), where('active', '==', true)));
  const posts: NewsPost[] = [];
  snap.forEach((entry) => {
    posts.push(mapNewsPost(entry.id, entry.data() as Record<string, unknown>));
  });
  return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
}

export async function fetchNewsBySlug(slug: string): Promise<NewsPost | null> {
  const snap = await getDoc(doc(db, 'newsPosts', slug));
  if (!snap.exists()) return null;
  const post = mapNewsPost(snap.id, snap.data() as Record<string, unknown>);
  return post.active ? post : null;
}
