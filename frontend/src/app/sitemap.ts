import type {MetadataRoute} from 'next';
import {getContent,getProducts} from '@/lib/api';
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
 const root=(process.env.NEXT_PUBLIC_SITE_URL||'https://faromid.com').replace(/\/$/,'');
 const sections=['','/products','/textures','/gallery','/exhibitions','/about','/careers','/collaboration','/dealership','/representatives','/contact','/news','/projects','/pages'];
 const [products,news,projects,pages]=await Promise.all([getProducts(),getContent('news'),getContent('project'),getContent('page')]);
 const paths=[...sections,...products.map(p=>p.href),...news.map(c=>`/news/${encodeURIComponent(c.slug)}`),...projects.map(c=>`/projects/${encodeURIComponent(c.slug)}`),...pages.map(c=>`/pages/${encodeURIComponent(c.slug)}`)];
 return paths.map(path=>({url:root+path,lastModified:new Date(),changeFrequency:'weekly' as const,priority:path===''?1:.6}));
}
