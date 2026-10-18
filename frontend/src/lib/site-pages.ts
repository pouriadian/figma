/** Public page-based CMS. Only published snapshots are available through this endpoint. */
import 'server-only';

export type CMSSection = {
  key: string;
  kind: 'hero' | 'text' | 'gallery' | 'products' | 'cards';
  title: string;
  subtitle: string;
  body: string; // Sanitized by Django/bleach at publish time.
  image: string;
  image_alt: string;
  link_label: string;
  link_url: string;
  enabled: boolean;
  images: Array<{url:string;caption:string;alt:string}>;
  product_ids: number[];
  sort_order: number;
};
export type CMSPage = {page:string;title:string;sections:CMSSection[]};

export async function getSitePage(page:string):Promise<CMSPage|null> {
  if (!/^[a-z0-9_-]+$/.test(page)) return null;
  const base=(process.env.API_INTERNAL_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
  try {
    const response=await fetch(`${base}/api/v1/site-pages/${page}/`,{
      cache:'no-store', signal:AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const value=await response.json() as CMSPage;
    return Array.isArray(value.sections)?value:null;
  } catch {return null;}
}
export function getSection(page:CMSPage|null|undefined,key:string):CMSSection|undefined {
  return page?.sections.find(section=>section.key===key&&section.enabled!==false);
}

export function isSectionHidden(page:CMSPage|null|undefined,key:string):boolean {
  return page?.sections.some(section=>section.key===key&&section.enabled===false)??false;
}
