export type InlinePart =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string; external: boolean };

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function isAllowedHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Splits a paragraph that may contain [label](/path) or [label](https://…) links. */
export function parseInlineMarkdown(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: 'text', text: text.slice(last, index) });
    const label = match[1].trim();
    const href = match[2].trim();
    if (label && isAllowedHref(href)) {
      parts.push({
        type: 'link',
        text: label,
        href,
        external: /^https?:\/\//i.test(href)
      });
    } else if (label) {
      parts.push({ type: 'text', text: label });
    }
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  if (parts.length === 0) parts.push({ type: 'text', text });
  return parts;
}
