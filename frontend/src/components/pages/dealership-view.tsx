import Image from 'next/image';
import Link from 'next/link';
import {SiteShell} from '@/components/layout/site-shell';
import {PageIntro} from '@/components/sections/page-intro';
import {Container} from '@/components/ui/brand-ui';
import {ContactMessageModal} from '@/components/contact-message-modal';
import {asset} from '@/lib/assets';
import {mediaWebp} from '@/lib/media';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function DealershipView(){const page=await getSitePage('dealership');const hero=getSection(page,'hero');const intro=getSection(page,'intro');return <SiteShell><PageIntro title={hero?.title||"اخذ نمایندگی"} subtitle="FAROMID DEALERSHIP" description="برای توسعهٔ همکاری و دسترسی به محصولات فرامید در شهر خود اقدام کنید." image={hero?.image||asset.dealership}/>
  <section className="bg-[#f5f5f1] py-16 sm:py-24"><Container><div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
    <div><div className="relative mb-7 aspect-[1.3] overflow-hidden rounded-[24px] bg-[#e7e7e2]"><Image src={intro?.image||mediaWebp('7a1c123ccba2ae8742f098b200b59b7eb3e9d180','dealership')} alt="نمایشگاه محصولات فرامید" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover"/></div><div className="text-[15px] leading-[2.5] text-[#596159]">{intro?.body?<div dangerouslySetInnerHTML={{__html:intro.body}}/>:"برای همکاری تجاری و اطلاع از شرایط اخذ نمایندگی محصولات فرامید، درخواست خود را به همراه نام شهر و اطلاعات تماس ارسال کنید."}</div></div>
    <div className="rounded-[26px] border border-[#e4e7e1] bg-white p-6 sm:p-9"><p className="mb-2 text-[10px] font-semibold tracking-[.18em] text-[#a82c39]" dir="ltr">FAROMID DEALERSHIP</p><h2 className="mb-3 mt-0 text-xl font-semibold text-[#252a26]">درخواست نمایندگی</h2><p className="mb-6 text-sm leading-7 text-[#727a73]">برای دریافت شرایط همکاری، درخواست خود را همراه با اطلاعات مجموعه و شهر موردنظر ثبت کنید.</p><ContactMessageModal type="dealership"/></div>
  </div><div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-[22px] bg-[#202321] p-6 text-white sm:p-8"><div><h2 className="text-lg font-semibold">فهرست نمایندگان تأییدشده</h2><p className="mt-2 text-sm text-white/60">نمایندگان رسمی فرامید را بر اساس نام و شهر مشاهده کنید.</p></div><Link href="/representatives" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#242724] hover:bg-[#f0f0ed]">مشاهده نمایندگان</Link></div></Container></section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','intro'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
