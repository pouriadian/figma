import {SiteShell} from '@/components/layout/site-shell';
import {HomeHero} from '@/components/sections/home-hero';
import {BrandMarquee} from '@/components/sections/brand-marquee';
import {HomeCollections,HomeValues,HomeGallery,HomeHistory,HomeSamples} from '@/components/sections/home-sections';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';
import {getSitePage,getSection,isSectionHidden} from '@/lib/site-pages';
import {CMSPreviewBridge} from './cms-preview-bridge';

/** Original sections render as before until an editor publishes an override. */
export async function HomeView(){
 const page=await getSitePage('home');
 const defaults=[
  {key:'hero',order:0}, {key:'marquee',order:5}, {key:'featured',order:10}, {key:'values',order:20},
  {key:'gallery',order:30}, {key:'about',order:40}, {key:'samples',order:50},
 ];
 const all=[...defaults.filter(section=>!isSectionHidden(page,section.key)).map(section=>({key:section.key,order:getSection(page,section.key)?.sort_order??section.order})),
  ...(page?.sections.filter(section=>section.enabled!==false&&!defaults.some(item=>item.key===section.key)).map(section=>({key:section.key,order:section.sort_order}))??[])];
 all.sort((a,b)=>a.order-b.order);
 return <SiteShell overlayHeader><CMSPreviewBridge/>{all.map(({key})=>{
  const content=getSection(page,key);
  const component=key==='hero'?<HomeHero content={content}/>
   :key==='marquee'?<BrandMarquee content={content}/>
   :key==='featured'?<HomeCollections content={content}/>
   :key==='values'?<HomeValues content={content}/>
   :key==='gallery'?<HomeGallery content={content}/>
   :key==='about'?<HomeHistory content={content}/>
   :key==='samples'?<HomeSamples content={content}/>
   :content?<CMSExtraBlock section={content}/>:null;
  return component?<div key={key} id={`cms-${key}`} data-cms-section={key} className="cms-preview-target">{component}</div>:null;
 })}</SiteShell>;

}
