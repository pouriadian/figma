import {SiteShell} from '@/components/layout/site-shell';
import {PageIntro} from '@/components/sections/page-intro';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {ContactForm} from '@/components/contact-form';
import {asset} from '@/lib/assets';
import {getPageMetadata} from '@/lib/seo';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';
export async function generateMetadata(){
  return getPageMetadata('collaboration', {title:'همکاری سازمانی | فرامید',description:'ثبت درخواست همکاری سازمانی و تجاری با گروه فرامید'});
}
export default async function CollaborationPage(){
  const page=await getSitePage('collaboration');const hero=getSection(page,'hero');const intro=getSection(page,'intro');
  return <SiteShell>
    <PageIntro title={hero?.title||"همکاری با فرامید"} subtitle="FAROMID PARTNERSHIP" description="برای آغاز یک همکاری حرفه‌ای و پایدار با گروه فرامید همراه شوید." image={hero?.image||asset.dealership}/>
    <section className="bg-[#f5f5f1] py-14 sm:py-20"><Container>
      <div className="mx-auto max-w-[760px] rounded-[26px] border border-[#e4e7e1] bg-white p-6 sm:p-10">
        <SectionTitle title={intro?.title||"درخواست همکاری سازمانی"}/>
        {intro?.body&&<div className="mb-7 text-sm leading-8 text-[#58665f]" dangerouslySetInnerHTML={{__html:intro.body}}/>}
        <ContactForm type="collaboration"/>
      </div>
    </Container></section>
    {page?.sections.filter(s=>s.enabled!==false&&!['hero','intro'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
  </SiteShell>;
}
