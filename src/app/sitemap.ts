import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap {
  return ['','/products','/textures','/gallery','/exhibitions','/about','/careers','/dealership','/contact'].map(path=>({url:`https://faromid.com${path}`,lastModified:new Date(),changeFrequency:'monthly' as const,priority:path===''?1:.7}));
}
