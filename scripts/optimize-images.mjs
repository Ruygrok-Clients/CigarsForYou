/**
 * Writes WebP variants for catalogue and news images, plus a URL manifest.
 * Does not modify Firestore or Storage. Missing credentials leave the manifest empty.
 */
import { createHash } from 'crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { accessToken, listCollection, readBool, readString } from './lib/firestore-rest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'media', 'opt');
const MANIFEST_PATH = join(ROOT, 'src', 'generated', 'image-manifest.json');
const SITE_ORIGIN = 'https://cigarsforyou.com.au';
const WIDTHS = [480, 800, 1200];
const WEBP_QUALITY = 85;

function manifestKeys(url) {
  const keys = new Set([url]);
  if (url.startsWith('/')) keys.add(`${SITE_ORIGIN}${url}`);
  if (url.startsWith(SITE_ORIGIN)) {
    const path = url.slice(SITE_ORIGIN.length) || '/';
    keys.add(path);
  }
  return [...keys];
}

async function loadSource(url) {
  if (url.startsWith('/')) {
    const local = join(ROOT, 'public', url.replace(/^\/+/, ''));
    try {
      return await readFile(local);
    } catch {
      return null;
    }
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function variantsFor(url, buffer) {
  const meta = await sharp(buffer).metadata();
  const intrinsic = meta.width || 0;
  if (!intrinsic) return null;
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const targets = WIDTHS.filter((width) => width <= intrinsic);
  const widths = targets.length > 0 ? targets : [intrinsic];
  const files = [];
  for (const width of widths) {
    const name = `${hash}-${width}.webp`;
    const file = join(OUT_DIR, name);
    await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(file);
    files.push({ width, src: `/media/opt/${name}` });
  }
  const largest = files[files.length - 1];
  return {
    src: largest.src,
    srcSet: files.map((file) => `${file.src} ${file.width}w`).join(', '),
  };
}

async function compressLocalJpegs(dir) {
  let names = [];
  try {
    names = await readdir(dir, { recursive: true });
  } catch {
    return 0;
  }
  let replaced = 0;
  for (const name of names) {
    const ext = extname(String(name)).toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg') continue;
    const file = join(dir, String(name));
    const input = await readFile(file);
    if (input.length < 400 * 1024) continue;
    const before = await sharp(input).metadata();
    const output = await sharp(input).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const after = await sharp(output).metadata();
    if (after.width !== before.width || after.height !== before.height) continue;
    if (output.length >= input.length * 0.85) continue;
    await writeFile(file, output);
    replaced += 1;
    console.log(`Compressed ${file} (${input.length} -> ${output.length})`);
  }
  return replaced;
}

async function run() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(dirname(MANIFEST_PATH), { recursive: true });

  const localCompressed = await compressLocalJpegs(join(ROOT, 'src', 'assets'));
  console.log(`Recompressed ${localCompressed} local JPEG files`);

  let token = '';
  try {
    token = accessToken();
  } catch (err) {
    console.warn('No Firestore credentials. Image manifest left empty.');
    console.warn(err instanceof Error ? err.message : err);
    await writeFile(MANIFEST_PATH, '{}\n');
    return;
  }

  const [products, news] = await Promise.all([
    listCollection(token, 'products'),
    listCollection(token, 'newsPosts'),
  ]);

  const urls = new Set();
  for (const doc of products) {
    if (!readBool(doc.fields?.active)) continue;
    const url = readString(doc.fields?.imageUrl);
    if (url) urls.add(url);
  }
  for (const doc of news) {
    if (!readBool(doc.fields?.active)) continue;
    const url = readString(doc.fields?.imageUrl);
    if (url) urls.add(url);
  }

  const manifest = {};
  let written = 0;
  for (const url of urls) {
    try {
      const buffer = await loadSource(url);
      if (!buffer) {
        console.warn(`Skipped unreadable image ${url}`);
        continue;
      }
      const variant = await variantsFor(url, buffer);
      if (!variant) continue;
      for (const key of manifestKeys(url)) manifest[key] = variant;
      written += 1;
    } catch (err) {
      console.warn(`Skipped ${url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${written} image variants to ${OUT_DIR}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
