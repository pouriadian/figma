import { productTexture } from '@/lib/assets';

export type CatalogProduct = {
  id: number;
  slug: string;
  href: string;
  image: string;
  model: string;
  name?: string;
  code: string | number;
  dimensions: string;
  view_count?: number;
};

const MODEL = 'CLEAN TOUCH';
const DIMENSIONS = '121 × 228';

export const CATALOG_PRODUCTS: CatalogProduct[] = Array.from({ length: 12 }, (_, index) => {
  const id = index + 1;
  return {
    id,
    slug: `product-${id}`,
    href: `/products/product-${id}`,
    image: productTexture((index % 8) + 1),
    model: MODEL,
    code: 7185 + index,
    dimensions: DIMENSIONS,
  };
});

export function catalogPageCount(perSlide: number) {
  return Math.ceil(CATALOG_PRODUCTS.length / perSlide);
}
