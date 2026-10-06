/** Canonical public brand string for titles, descriptions, and structured data. */
export const BRAND_NAME = 'CigarsForYou';

/** ABN published in the footer and Organization schema. */
export const BRAND_ABN = '23 679 156 131';

export function brandTitle(page: string): string {
  return `${page} | ${BRAND_NAME}`;
}
