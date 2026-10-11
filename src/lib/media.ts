import hashCategories from '@/lib/asset-paths.json';

/** Folder names under `public/assets/`. */
export type MediaCategory =
  | 'about'
  | 'backgrounds'
  | 'contact'
  | 'dealership'
  | 'exhibitions'
  | 'gallery'
  | 'home'
  | 'products'
  | 'shared';

export const brand = {
  logo: '/assets/logo/logo.svg',
  heroStripes: '/assets/ui/hero-stripes.svg',
  homeHistoryPanels: '/assets/home/history-panels.png',
  moreButton: '/assets/ui/more-button.svg',
} as const;

export function mediaUrl(category: MediaCategory, file: string) {
  return `/assets/${category}/${file}`;
}

const hashToCategory = hashCategories.hashToCategory as Record<string, MediaCategory>;

export function mediaWebp(hash: string, category?: MediaCategory) {
  const cat = category ?? hashToCategory[hash] ?? 'shared';
  return mediaUrl(cat, `${hash}.webp`);
}

export function productTexture(index: number) {
  return `/assets/products/textures/texture-${index}.webp`;
}
