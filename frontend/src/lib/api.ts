/** Server-only Django API client. Never expose API_INTERNAL_URL to the browser. */
import 'server-only';
import type {CatalogProduct} from '@/lib/products-catalog';

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
  return Array.isArray(data)?data:[];
}

export async function getProducts():Promise<ProductApiItem[]> {
  const data = await getJson<Page<ProductApiItem>>('products/?page_size=100', 60);
  if (data?.results) return data.results;
  // Never invent published products when the database is unavailable.
  return [];
}

export async function getProduct(slug:string):Promise<ProductApiItem|null> {
  const fromDb = await getJson<ProductApiItem>(`products/${encodeURIComponent(slug)}/`, 0);
  if (fromDb) return fromDb;
  return null;
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
