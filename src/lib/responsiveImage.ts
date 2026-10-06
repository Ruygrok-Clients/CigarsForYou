import manifestJson from '../generated/image-manifest.json';
import { SITE_ORIGIN } from './seo';

export interface ImageVariant {
  src: string;
  srcSet: string;
}

const manifest = manifestJson as Record<string, ImageVariant>;

export interface ResponsiveImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
}

/** Swap in a build-time variant when one exists. Otherwise keep the current URL. */
export function responsiveImage(url: string | undefined | null, sizes?: string): ResponsiveImageProps {
  const raw = (url || '').trim();
  if (!raw) return { src: '' };
  const path = raw.startsWith(SITE_ORIGIN) ? raw.slice(SITE_ORIGIN.length) || '/' : raw;
  const absolute = raw.startsWith('/') ? `${SITE_ORIGIN}${raw}` : raw;
  const entry = manifest[raw] || manifest[absolute] || manifest[path];
  if (!entry?.src) return { src: raw };
  return {
    src: entry.src,
    srcSet: entry.srcSet,
    ...(sizes ? { sizes } : {}),
  };
}
