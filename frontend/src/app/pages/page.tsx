import {SiteShell} from '@/components/layout/site-shell';
import {ContentListing} from '@/components/pages/content-listing';
import {getContent} from '@/lib/api';
import {getPageMetadata} from '@/lib/seo';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';
export async function generateMetadata(){return getPageMetadata('pages',{title:'مطالب | فرامید',description:'مطالب رسمی فرامید'});}
export default async function Page(){const page=await getSitePage('pages');return <SiteShell><ContentListing items={await getContent('page')} title={getSection(page,'hero')?.title||"مطالب"} base="/pages"/>{page?.sections.filter(s=>s.enabled!==false&&s.key!=='hero').map(s=><CMSExtraBlock key={s.key} section={s}/>)}</SiteShell>}
