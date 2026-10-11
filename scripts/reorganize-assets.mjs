import fs from 'fs';
import path from 'path';

const root = process.cwd();
const imagesDir = path.join(root, 'public/assets/images');
const designDir = path.join(root, 'src/design');

const categoryPriority = [
  'home',
  'products',
  'gallery',
  'exhibitions',
  'about',
  'careers',
  'dealership',
  'contact',
];

/** @type {Record<string, string>} */
const manualCategory = {
  '8b06ccdc303e9ae1063d16d0fc4224ee7d71279a': 'home',
  '2c778afe354aaf2febbaf0bf20ac1a55': 'backgrounds',
  'b64de2f4b544c1901affa3f8dce63e6f47283ee7': 'backgrounds',
  '0b838c0993451b4be85abf3d6ab7bbd37837a19f': 'products',
  '3a83e1dd6e6f470491bea0c34a5df899390ba83b': 'backgrounds',
  'bb579bb09a5911958c75477df6aa1b7f18e1368c': 'contact',
  '0d55872d0c1e6e2847dfc322c37297fd17953f97': 'backgrounds',
  'ebffed74cf2a9cc7dce3227d0f1e1ffa12696965': 'dealership',
  '7a1c123ccba2ae8742f098b200b59b7eb3e9d180': 'dealership',
  'be7057755c3f1501497e513959a2c4301d4e9755': 'about',
};

function pickCategory(sets) {
  const pages = [...sets];
  for (const p of categoryPriority) {
    if (pages.includes(p)) return p;
  }
  return pages[0] || 'shared';
}

const hashPages = {};
for (const file of fs.readdirSync(designDir).filter((f) => f.endsWith('.json'))) {
  const page = file.replace('.json', '');
  const text = fs.readFileSync(path.join(designDir, file), 'utf8');
  const re = /\/assets\/images\/([a-f0-9]+)\.webp/g;
  let m;
  while ((m = re.exec(text))) {
    const hash = m[1];
    if (!hashPages[hash]) hashPages[hash] = new Set();
    hashPages[hash].add(page);
  }
}

const textureHashes = new Set(
  fs
    .readdirSync(path.join(root, 'public/assets/textures'))
    .filter((f) => f.endsWith('.webp'))
    .map((f) => {
      const inImages = path.join(imagesDir, f.replace('texture-', '').replace('.webp', '') + '.webp');
      return null;
    }),
);

/** @type {Record<string, string>} */
const hashToCategory = {};
for (const [hash, sets] of Object.entries(hashPages)) {
  hashToCategory[hash] = manualCategory[hash] || pickCategory(sets);
}

// Images on disk not referenced in design JSON
for (const file of fs.readdirSync(imagesDir).filter((f) => f.endsWith('.webp'))) {
  const hash = file.replace(/\.webp$/, '');
  if (!hashToCategory[hash]) hashToCategory[hash] = 'shared';
}

const categories = new Set(Object.values(hashToCategory));
for (const cat of categories) {
  fs.mkdirSync(path.join(root, 'public/assets', cat), { recursive: true });
}

fs.mkdirSync(path.join(root, 'public/assets/logo'), { recursive: true });
fs.mkdirSync(path.join(root, 'public/assets/ui'), { recursive: true });

const moves = [];
for (const [hash, cat] of Object.entries(hashToCategory)) {
  const src = path.join(imagesDir, `${hash}.webp`);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(root, 'public/assets', cat, `${hash}.webp`);
  if (path.resolve(src) !== path.resolve(dest)) {
    fs.renameSync(src, dest);
    moves.push({ hash, cat });
  }
}

// SVG / brand assets
const designAssets = [
  ['public/assets/design/logo.svg', 'public/assets/logo/logo.svg'],
  ['public/assets/design/hero-stripes.svg', 'public/assets/ui/hero-stripes.svg'],
  ['public/assets/design/more-button.svg', 'public/assets/ui/more-button.svg'],
];
for (const [from, to] of designAssets) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
  }
}

// Update design JSON paths
const oldPrefix = '/assets/images/';
for (const file of fs.readdirSync(designDir).filter((f) => f.endsWith('.json'))) {
  let text = fs.readFileSync(path.join(designDir, file), 'utf8');
  text = text.replace(/\/assets\/images\/([a-f0-9]+)\.webp/g, (_, hash) => {
    const cat = hashToCategory[hash] || 'shared';
    return `/assets/${cat}/${hash}.webp`;
  });
  fs.writeFileSync(path.join(designDir, file), text);
}

// Write mapping for assets.ts generation
fs.writeFileSync(
  path.join(root, 'src/lib/asset-paths.json'),
  JSON.stringify({ hashToCategory, moves: moves.length }, null, 2),
);

// Product texture swatches (numbered files)
const productsTexturesDir = path.join(root, 'public/assets/products/textures');
fs.mkdirSync(productsTexturesDir, { recursive: true });
const texturesDir = path.join(root, 'public/assets/textures');
if (fs.existsSync(texturesDir)) {
  for (const file of fs.readdirSync(texturesDir).filter((f) => f.endsWith('.webp'))) {
    fs.renameSync(path.join(texturesDir, file), path.join(productsTexturesDir, file));
  }
  try {
    fs.rmdirSync(texturesDir);
  } catch {
    /* not empty */
  }
}

// Remove empty legacy folders
try {
  fs.rmdirSync(imagesDir);
} catch {
  /* */
}
try {
  fs.rmdirSync(path.join(root, 'public/assets/design'));
} catch {
  /* */
}

console.log('Moved', moves.length, 'images into', [...categories].sort().join(', '));
console.log('Categories:', Object.fromEntries([...categories].map((c) => [c, moves.filter((m) => m.cat === c).length])));
