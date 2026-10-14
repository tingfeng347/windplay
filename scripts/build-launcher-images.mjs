import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, 'assets/launcher');
const htmlPath = resolve(root, 'index.html');
const original = await readFile(htmlPath, 'utf8');
const settings = { thumbnailWidths: [320, 480, 640], previewWidths: [640, 960, 1280], quality: 80 };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = { settings, sources: {} };
const images = [...original.matchAll(/<img\b[^>]*data-image-source="([^"]+)"[^>]*>/g)];
if (!images.length) throw new Error('No launcher image sources found');
await mkdir(directory, { recursive: true });
const needed = new Map();
for (const [tag, source] of images) {
  const widths = needed.get(source) || new Set();
  for (const width of settings.thumbnailWidths) widths.add(width);
  if (tag.includes('data-image-role="preview"')) for (const width of settings.previewWidths) widths.add(width);
  needed.set(source, widths);
}
for (const [source, widths] of needed) {
  if (!source.startsWith('assets/') || source.split('/').includes('..')) throw new Error(`Invalid source: ${source}`);
  const bytes = await readFile(resolve(root, source));
  const metadata = await sharp(bytes).metadata();
  const stem = source.slice(7, -extname(source).length).replaceAll('/', '-');
  const variants = [];
  for (const width of [...new Set([...widths].map(width => Math.min(width, metadata.width)))].sort((a, b) => a - b)) {
    const { data, info } = await sharp(bytes).resize({ width, withoutEnlargement: true })
      .webp({ quality: settings.quality }).toBuffer({ resolveWithObject: true });
    const file = `assets/launcher/${stem}-${info.width}.webp`;
    await writeFile(resolve(root, file), data);
    variants.push({ file, width: info.width, height: info.height, bytes: data.length, sha256: digest(data) });
  }
  manifest.sources[source] = { sha256: digest(bytes), width: metadata.width, height: metadata.height, variants };
}
const attributes = (tag, values) => {
  for (const [key, value] of Object.entries(values)) {
    tag = tag.replace(new RegExp(`\\s${key}="[^"]*"`, 'g'), '');
    if (value !== null) tag = tag.replace(/>$/, ` ${key}="${value}">`);
  }
  return tag;
};
const heroSizes = '(max-width: 700px) calc(50vw - 40px), (max-width: 1000px) calc(33.333vw - 64px), (max-width: 1312px) calc(16.667vw - 53px), 166px';
let heroIndex = 0;
const html = original.replace(/<img\b[^>]*data-image-source="([^"]+)"[^>]*>/g, (tag, source) => {
  const entry = manifest.sources[source];
  const thumbnails = entry.variants.filter(v => v.width <= 640);
  const fallback = thumbnails.find(v => v.width === 480) || thumbnails[0];
  const srcset = variants => variants.map(v => `${v.file} ${v.width}w`).join(', ');
  const preview = tag.includes('data-image-role="preview"');
  return attributes(tag, {
    src: fallback.file, width: entry.width, height: entry.height,
    srcset: preview ? null : srcset(thumbnails), sizes: preview ? null : heroSizes,
    'data-preview-srcset': preview ? srcset(entry.variants.filter(v => v.width >= 640 || v === entry.variants.at(-1))) : null,
    loading: preview || heroIndex++ >= 2 ? 'lazy' : 'eager', decoding: 'async'
  });
});
await writeFile(htmlPath, html);
await writeFile(resolve(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const expected = new Set(Object.values(manifest.sources).flatMap(entry => entry.variants.map(v => relative(directory, resolve(root, v.file)))));
for (const file of await readdir(directory)) {
  if (file.endsWith('.webp') && !expected.has(file)) await unlink(resolve(directory, file));
}
console.log(`首页图片：${needed.size} 个原图 → ${expected.size} 个 WebP 尺寸版本`);
