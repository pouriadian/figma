/** Server-only Django API client. Never expose API_INTERNAL_URL to the browser. */
import 'server-only';
import type {CatalogProduct} from '@/lib/products-catalog';
import snapshot from '@/lib/faromid-products-snapshot.json';

const BASE = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export type CMSItem = {
  id:number; kind:string; title:string; slug:string; summary:string; body:string;
  image:string; images:{id:number;url:string;caption:string}[];
  seo_title?:string; seo_description?:string; published_at?:string;
};

export type ProductApiItem = CatalogProduct & {
  id?:number;
  name:string; description?:string; technical_specs?:Record<string,unknown>;
  category_name?:string; category_slug?:string; catalog_url?:string;
  seo_title?:string; seo_description?:string;
  images?:{id:number;url:string;caption:string}[];
};

type Page<T> = {results:T[]; count:number};
export type ProductCategory={id:number;name:string;slug:string};

const snapshotProducts = snapshot.products as ProductApiItem[];

/**
 * Product uploads live on Django. When the frontend is presented without a
 * deployed backend, use the matching checked-in asset instead of leaving a
 * broken /uploads URL in the product card.
 */
function withLocalProductImage(product:ProductApiItem):ProductApiItem {
  const local = snapshotProducts.find(item => item.id === product.id || item.slug === product.slug);
  const image = product.image || '';
  const backendImage = image.startsWith('/uploads/') || image.startsWith('/media/');
  return {
    ...product,
    image: (backendImage || !image) && local?.image ? local.image : image,
  };
}

async function getJson<T>(path:string, seconds=60):Promise<T|null> {
  try {
    const res = await fetch(`${BASE}/api/v1/${path}`, {next:{revalidate:seconds}, signal:AbortSignal.timeout(6000)});
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function getCategories():Promise<ProductCategory[]> {
  const data=await getJson<ProductCategory[]>('categories/',60);
  return Array.isArray(data)&&data.length>0?data:snapshot.categories;
}

export async function getProducts():Promise<ProductApiItem[]> {
  const data = await getJson<Page<ProductApiItem>>('products/?page_size=100', 60);
  if (data?.results?.length) return data.results.map(withLocalProductImage);
  // Temporary read-only snapshot exported from the actual local Django database.
  // Remove this fallback once the production Django API and database are available.
  return snapshotProducts;
}

export async function getProduct(slug:string):Promise<ProductApiItem|null> {
  const fromDb = await getJson<ProductApiItem>(`products/${encodeURIComponent(slug)}/`, 0);
  if (fromDb) return withLocalProductImage(fromDb);
  return snapshotProducts.find(p => p.slug === slug) ?? null;
}

export async function getContent(kind:string):Promise<CMSItem[]> {
  const allowed = ['gallery','exhibition','news','project','page'];
  if (!allowed.includes(kind)) return [];
  const data = await getJson<Page<CMSItem>>(`content/?kind=${kind}&page_size=100`,60);
  return data?.results ?? [];
}

export async function getContentDetail(slug:string):Promise<CMSItem|null> {
  return getJson<CMSItem>(`content/${encodeURIComponent(slug)}/`,60);
}
