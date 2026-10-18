import {SiteShell} from '@/components/layout/site-shell';
import {PageIntro} from '@/components/sections/page-intro';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {ContactForm} from '@/components/contact-form';
import {asset} from '@/lib/assets';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function CareersView(){const page=await getSitePage('careers');const hero=getSection(page,'hero');const intro=getSection(page,'intro');return <SiteShell><PageIntro title={hero?.title||"همکاری با ما"} image={hero?.image||asset.careers}/>
  <section className="bg-[#f5f5f1] py-16 sm:py-24"><Container><div className="mx-auto max-w-[850px]">
    <div className="mb-10 text-[15px] leading-[2.6] text-[#5c655d]">{intro?.body?<div dangerouslySetInnerHTML={{__html:intro.body}}/>:"فلسفه کاری در فرامید مبتنی بر احترام و اخلاق حرفه‌ای می‌باشد که منجر به ایجاد محیط کاری دوستانه بر اساس معیارهای بین‌المللی و توأم با پیشرفت و یادگیری مستمر است."}</div>
    <div className="rounded-[26px] border border-[#e4e7e1] bg-white p-6 sm:p-10"><SectionTitle title="ارسال رزومه"/><p className="mb-6 text-[13px] leading-[2.2] text-[#7b817a]">رزومه PDF یا DOCX خود را از طریق فرم زیر ارسال کنید؛ نتیجه در پنل مدیریت ثبت می‌شود.</p><ContactForm type="careers"/></div>
  </div></Container></section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','intro'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
