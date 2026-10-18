import 'server-only';
import type {Metadata} from 'next';

type PageSEO={title:string;description:string;seo_title:string;seo_description:string;canonical_url:string;indexable:boolean};
export async function getPageMetadata(route:string,fallback:{title:string;description:string}):Promise<Metadata>{
 const base=(process.env.API_INTERNAL_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
 try{
  const res=await fetch(`${base}/api/v1/seo/${route.replace(/^\//,'')||'home'}/`,{next:{revalidate:120},signal:AbortSignal.timeout(5000)});
  if(res.ok){const item=await res.json() as PageSEO;return {
   title:item.seo_title||item.title||fallback.title,
   description:item.seo_description||item.description||fallback.description,
   alternates:item.canonical_url?{canonical:item.canonical_url}:undefined,
   robots:{index:item.indexable,follow:item.indexable}
  };}
 }catch{}
 return fallback;
}
