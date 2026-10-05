import * as logger from "firebase-functions/logger";
import type { DocumentData } from "firebase-admin/firestore";

/** Public IndexNow key — also hosted at /{key}.txt on the live site. */
export const INDEXNOW_KEY = "778303fccee6212d5b66503c3f71025f";

const ORIGIN = "https://cigarsforyou.com.au";
const HOST = "cigarsforyou.com.au";
const KEY_LOCATION = `${ORIGIN}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";

type ProductRange = "cigars" | "cigarettes" | "accessories" | string;

/** Fields that change what search engines should re-fetch (ignore stock / FBT noise). */
const PRODUCT_INDEX_FIELDS = [
  "slug",
  "name",
  "brand",
  "catalogCategoryId",
  "category",
  "active",
  "imageUrl",
  "price",
  "origin",
  "description",
  "shortDescription",
  "specifications",
] as const;

const CATEGORY_INDEX_FIELDS = ["slug", "name", "range", "sortOrder"] as const;

const NEWS_INDEX_FIELDS = [
  "slug",
  "title",
  "excerpt",
  "body",
  "imageUrl",
  "publishedAt",
  "active",
  "readMinutes",
] as const;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function stableJson(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function fieldsChanged(
  before: DocumentData | undefined,
  after: DocumentData | undefined,
  fields: readonly string[]
): boolean {
  if (!before || !after) return true;
  return fields.some((field) => stableJson(before[field]) !== stableJson(after[field]));
}

export function categoryPath(range: ProductRange, slug: string): string {
  if (!slug) return "";
  if (range === "cigarettes") return `/cigarettes/${slug}`;
  if (range === "accessories") return `/accessories/${slug}`;
  return `/shop/${slug}`;
}

export function productUrl(slug: string): string | null {
  if (!slug) return null;
  return `${ORIGIN}/product/${slug}`;
}

export function categoryUrl(range: ProductRange, slug: string): string | null {
  const path = categoryPath(range, slug);
  return path ? `${ORIGIN}${path}` : null;
}

export function newsUrl(slug: string): string | null {
  if (!slug) return null;
  return `${ORIGIN}/news/${slug}`;
}

export function urlsForProductChange(
  before: DocumentData | undefined,
  after: DocumentData | undefined
): string[] {
  const urls = new Set<string>();
  const beforeSlug = asString(before?.slug);
  const afterSlug = asString(after?.slug);

  if (beforeSlug) {
    const url = productUrl(beforeSlug);
    if (url) urls.add(url);
  }
  if (afterSlug && afterSlug !== beforeSlug) {
    const url = productUrl(afterSlug);
    if (url) urls.add(url);
  }

  // Parent range listing when a product is created, deleted, or changes range/active.
  const beforeRange = asString(before?.category) || "cigars";
  const afterRange = asString(after?.category) || beforeRange;
  const beforeActive = before ? asBool(before.active, true) : undefined;
  const afterActive = after ? asBool(after.active, true) : undefined;
  if (!before || !after || beforeRange !== afterRange || beforeActive !== afterActive) {
    for (const range of new Set([beforeRange, afterRange])) {
      if (range === "cigarettes") urls.add(`${ORIGIN}/cigarettes`);
      else if (range === "accessories") urls.add(`${ORIGIN}/accessories`);
      else urls.add(`${ORIGIN}/shop`);
    }
  }

  return [...urls];
}

export function shouldNotifyProduct(
  before: DocumentData | undefined,
  after: DocumentData | undefined
): boolean {
  if (!before || !after) return true;
  return fieldsChanged(before, after, PRODUCT_INDEX_FIELDS);
}

export function urlsForCategoryChange(
  before: DocumentData | undefined,
  after: DocumentData | undefined
): string[] {
  const urls = new Set<string>();
  const beforeSlug = asString(before?.slug);
  const afterSlug = asString(after?.slug);
  const beforeRange = asString(before?.range) || "cigars";
  const afterRange = asString(after?.range) || beforeRange;

  if (beforeSlug) {
    const url = categoryUrl(beforeRange, beforeSlug);
    if (url) urls.add(url);
  }
  if (afterSlug && (afterSlug !== beforeSlug || afterRange !== beforeRange)) {
    const url = categoryUrl(afterRange, afterSlug);
    if (url) urls.add(url);
  }

  for (const range of new Set([beforeRange, afterRange])) {
    if (range === "cigarettes") urls.add(`${ORIGIN}/cigarettes`);
    else if (range === "accessories") urls.add(`${ORIGIN}/accessories`);
    else urls.add(`${ORIGIN}/shop`);
  }

  return [...urls];
}

export function shouldNotifyCategory(
  before: DocumentData | undefined,
  after: DocumentData | undefined
): boolean {
  if (!before || !after) return true;
  return fieldsChanged(before, after, CATEGORY_INDEX_FIELDS);
}

export function urlsForNewsChange(
  before: DocumentData | undefined,
  after: DocumentData | undefined,
  docId: string
): string[] {
  const urls = new Set<string>();
  const beforeSlug = asString(before?.slug) || (before ? docId : "");
  const afterSlug = asString(after?.slug) || (after ? docId : "");

  if (beforeSlug) {
    const url = newsUrl(beforeSlug);
    if (url) urls.add(url);
  }
  if (afterSlug && afterSlug !== beforeSlug) {
    const url = newsUrl(afterSlug);
    if (url) urls.add(url);
  }

  if (!before || !after || asBool(before.active, true) !== asBool(after.active, true)) {
    urls.add(`${ORIGIN}/news`);
  }

  return [...urls];
}

export function shouldNotifyNews(
  before: DocumentData | undefined,
  after: DocumentData | undefined
): boolean {
  if (!before || !after) return true;
  return fieldsChanged(before, after, NEWS_INDEX_FIELDS);
}

/**
 * Notify IndexNow (Bing and other participants) that these URLs changed.
 * Empty lists are no-ops. Failures are logged; callers should not throw to users.
 */
export async function submitIndexNowUrls(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter((url) => url.startsWith(`${ORIGIN}/`) || url === ORIGIN || url === `${ORIGIN}/`))];
  if (unique.length === 0) return;

  // IndexNow allows up to 10,000 URLs per request.
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10000) {
    chunks.push(unique.slice(i, i + 10000));
  }

  for (const urlList of chunks) {
    const body = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    };

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (res.status === 200 || res.status === 202) {
        logger.info(`IndexNow accepted ${urlList.length} URL(s)`, {
          status: res.status,
          sample: urlList.slice(0, 5),
        });
      } else {
        logger.error(`IndexNow rejected submission`, {
          status: res.status,
          body: text.slice(0, 500),
          sample: urlList.slice(0, 5),
        });
      }
    } catch (err) {
      logger.error("IndexNow request failed", err);
    }
  }
}
