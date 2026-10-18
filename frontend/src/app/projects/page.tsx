import {SiteShell} from '@/components/layout/site-shell';
import {ContentListing} from '@/components/pages/content-listing';
import {getContent} from '@/lib/api';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';
import {getPageMetadata} from '@/lib/seo';
export async function generateMetadata(){return getPageMetadata('projects',{title:'پروژه‌های اجراشده | فرامید',description:'پروژه‌های دکوراسیون داخلی فرامید'});}
export default async function Page(){const page=await getSitePage('projects');return <SiteShell><ContentListing items={await getContent('project')} title={getSection(page,'hero')?.title||"پروژه‌های اجراشده"} base="/projects"/>{page?.sections.filter(s=>s.key!=='hero').map(s=><CMSExtraBlock key={s.key} section={s}/>)}</SiteShell>}
