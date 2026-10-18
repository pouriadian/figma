import {SiteShell} from '@/components/layout/site-shell';
import {ContentListing} from '@/components/pages/content-listing';
import {getContent} from '@/lib/api';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';
import {getPageMetadata} from '@/lib/seo';
export async function generateMetadata(){return getPageMetadata('news',{title:'اخبار | فرامید',description:'آخرین اخبار گروه فرامید'});}
export default async function Page(){const page=await getSitePage('news');return <SiteShell><ContentListing items={await getContent('news')} title={getSection(page,'hero')?.title||"اخبار"} base="/news"/>{page?.sections.filter(s=>s.key!=='hero').map(s=><CMSExtraBlock key={s.key} section={s}/>)}</SiteShell>}
